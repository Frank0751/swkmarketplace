import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CART_PRODUCT_COLUMNS,
  lineProblem,
  priceCart,
  toPriceableLine,
  type CatalogueProduct,
  type LineProblem,
  type PricedCart,
} from '@/lib/cart/pricing'
import {
  sendAdminAlert,
  sendCheckoutReceipt,
  sendVendorCheckoutNotification,
} from '@/lib/email/brevo'
import { formatCurrency } from '@/lib/utils'
import type { Checkout, CheckoutItem } from '@/types'

// Server-side checkout steps shared by the checkout API, the Paystack webhook
// and the buyer's return from Paystack.

export async function loadCartProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, CatalogueProduct>> {
  if (productIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('products')
    .select(CART_PRODUCT_COLUMNS)
    .in('id', productIds)
  if (error) throw error
  const products = (data ?? []) as unknown as CatalogueProduct[]
  return new Map(products.map(p => [p.id, p]))
}

/** Same product twice in a request (two tabs adding to one cart) counts once */
export function mergeLines(items: { product_id: string; quantity: number }[]) {
  const merged = new Map<string, number>()
  for (const item of items) {
    merged.set(item.product_id, (merged.get(item.product_id) ?? 0) + item.quantity)
  }
  return Array.from(merged, ([product_id, quantity]) => ({ product_id, quantity }))
}

/**
 * Price a cart from the database. Returns what's wrong with any line instead
 * of a price when the cart can't be bought as it stands.
 */
export function priceFromCatalogue(
  items: { product_id: string; quantity: number }[],
  products: Map<string, CatalogueProduct>,
  buyerId: string,
): { cart: PricedCart; problems: LineProblem[] } {
  const problems: LineProblem[] = []
  for (const item of items) {
    const problem = lineProblem(item.product_id, item.quantity, products.get(item.product_id), buyerId)
    if (problem) problems.push(problem)
  }
  const lines = items
    .map(item => {
      const product = products.get(item.product_id)
      return product ? toPriceableLine(product, item.quantity) : null
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)
  return { cart: priceCart(lines), problems }
}

/** The priced cart as stored on the checkout row */
export function checkoutItems(cart: PricedCart): CheckoutItem[] {
  return cart.lines.map(line => ({
    product_id:   line.product_id,
    vendor_id:    line.vendor_id,
    vendor_name:  line.vendor_name,
    title:        line.title,
    slug:         line.slug,
    image:        line.image,
    unit:         line.unit ?? null,
    quantity:     line.quantity,
    unit_price:   line.unit_price,
    subtotal:     line.subtotal,
    delivery_fee: line.delivery_fee,
    total:        line.total,
  }))
}

export type FulfilOutcome = 'paid' | 'already_paid' | 'not_pending' | 'not_found'

export interface FulfilResult {
  outcome: FulfilOutcome
  order_ids?: string[]
  status?: string
}

/**
 * Turn a paid checkout into orders (one per item, each with its escrow payout)
 * and send the receipt. Safe to call twice: the database creates the orders
 * once and the emails go out only the first time.
 */
export async function fulfilCheckout(
  admin: SupabaseClient,
  checkoutId: string,
  payment: { channel: 'card' | 'mobile_money'; label: string; paystackReference?: string | null; transactionId?: string | null },
): Promise<FulfilResult> {
  const { data, error } = await admin.rpc('fulfil_checkout', {
    p_checkout_id:        checkoutId,
    p_channel:            payment.channel,
    p_label:              payment.label,
    p_paystack_reference: payment.paystackReference ?? null,
    p_transaction_id:     payment.transactionId ?? null,
  })
  if (error) throw error

  const result = data as FulfilResult
  if (result.outcome === 'paid') {
    await notifyCheckoutPaid(admin, checkoutId).catch(err =>
      console.error('[Checkout] notifications failed:', err),
    )
  }
  return result
}

type OrderForNotice = {
  id: string
  reference: string
  product_id: string
  quantity: number
  total_amount: number
  vendor_id: string
  vendor: { business_name?: string; user?: { email?: string } | null } | null
}

async function notifyCheckoutPaid(admin: SupabaseClient, checkoutId: string) {
  const [{ data: checkout }, { data: orderRows }] = await Promise.all([
    admin
      .from('checkouts')
      .select('*, buyer:users(email, full_name)')
      .eq('id', checkoutId)
      .single(),
    admin
      .from('orders')
      .select('id, reference, product_id, quantity, total_amount, vendor_id, vendor:vendor_profiles(business_name, user:users(email))')
      .eq('checkout_id', checkoutId),
  ])
  if (!checkout) return

  const co = checkout as unknown as Checkout & { buyer: { email?: string; full_name?: string } | null }
  const orders = (orderRows ?? []) as unknown as OrderForNotice[]
  const orderFor = (productId: string) => orders.find(o => o.product_id === productId)
  const buyerName = co.buyer?.full_name ?? 'there'

  const sends: Promise<unknown>[] = []

  if (co.buyer?.email) {
    sends.push(sendCheckoutReceipt(co.buyer.email, {
      checkout_id:      co.id,
      reference:        co.reference,
      buyer_name:       buyerName,
      items:            co.items.map(item => ({
        title:           item.title,
        quantity:        item.quantity,
        total:           item.subtotal,
        vendor_name:     item.vendor_name,
        order_reference: orderFor(item.product_id)?.reference,
      })),
      subtotal:         co.subtotal,
      delivery_total:   co.delivery_total,
      total:            co.total_amount,
      payment_label:    co.payment_label ?? 'Online payment',
      delivery_address: co.delivery_address,
      delivery_region:  co.delivery_region,
      is_demo:          co.is_demo,
    }))
  }

  // Sample shops have no inbox, and a sample payment needs nothing from the team
  if (!co.is_demo) {
    const byVendor = new Map<string, OrderForNotice[]>()
    for (const order of orders) {
      byVendor.set(order.vendor_id, [...(byVendor.get(order.vendor_id) ?? []), order])
    }
    for (const vendorOrders of Array.from(byVendor.values())) {
      const email = vendorOrders[0].vendor?.user?.email
      if (!email) continue
      sends.push(sendVendorCheckoutNotification(email, {
        buyer_name:      buyerName,
        delivery_region: co.delivery_region,
        orders:          vendorOrders.map(o => ({
          reference: o.reference,
          title:     co.items.find(i => i.product_id === o.product_id)?.title ?? 'Product',
          quantity:  o.quantity,
          total:     o.total_amount,
        })),
      }))
    }

    sends.push(sendAdminAlert({
      subject: `New paid checkout ${co.reference}`,
      heading: `${orders.length === 1 ? 'A new order has' : `${orders.length} new orders have`} been paid`,
      intro:   'The money is held in escrow. Each vendor has been asked to confirm within 24 hours.',
      rows: [
        ['Payment', co.reference],
        ['Orders', orders.map(o => o.reference).join(', ')],
        ['Shops', Array.from(new Set(orders.map(o => o.vendor?.business_name ?? 'Shop'))).join(', ')],
        ['Amount', formatCurrency(co.total_amount)],
        ['Deliver to', co.delivery_region],
      ],
      cta: { path: '/admin/orders', label: 'Open orders' },
    }))
  }

  const results = await Promise.allSettled(sends)
  results.forEach(r => {
    if (r.status === 'rejected') console.error('[Checkout email]', r.reason)
  })
}
