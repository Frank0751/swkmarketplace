import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyPayment, type VerifyPaymentResult } from '@/lib/paystack/client'
import {
  sendOrderConfirmation,
  sendVendorOrderNotification,
  sendAdminAlert,
} from '@/lib/email/brevo'
import { formatCurrency } from '@/lib/utils'
import { fulfilCheckout } from '@/lib/checkout/server'

// ─── Deciding whether a payment really pays for an order ─────────────────────
//
// The webhook used to mark an order paid on the strength of the order id in
// the payment's metadata, without checking the amount. Anyone can start a
// Paystack payment with the public key and attach any metadata, so GHS 1
// could settle a GHS 500 order. Now every path (webhook, the buyer returning
// from Paystack, a retried payment) goes through settleOrderPayment, which
// asks Paystack for the transaction and compares amount and currency first.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Paystack amounts are integer pesewas */
export function expectedPesewas(totalGhs: number | string): number {
  return Math.round(Number(totalGhs) * 100)
}

export type PaymentVerdict = 'pay' | 'already_processed' | 'not_successful' | 'amount_mismatch'

export function assessPayment(
  order: { status: string; total_amount: number | string },
  payment: Pick<VerifyPaymentResult, 'status' | 'amount' | 'currency'>,
): PaymentVerdict {
  if (order.status !== 'pending') return 'already_processed'
  if (payment.status !== 'success') return 'not_successful'
  if (payment.currency !== 'GHS' || payment.amount !== expectedPesewas(order.total_amount)) {
    return 'amount_mismatch'
  }
  return 'pay'
}

export interface SettleResult {
  outcome: 'paid' | 'already_processed' | 'not_successful' | 'amount_mismatch' | 'order_not_found'
  orderId?: string
  status?: string
}

type OrderRow = {
  id: string
  reference: string
  status: string
  total_amount: number
  admin_notes: string | null
}

const ORDER_COLUMNS = 'id, reference, status, total_amount, admin_notes'

/**
 * Mark an order paid if, and only if, Paystack confirms a successful GHS
 * payment of exactly the order total. Idempotent: the webhook, the buyer's
 * redirect and a retried payment can all call it for the same transaction.
 * Throws when Paystack or the database can't be reached, so the webhook can
 * answer 500 and Paystack retries later.
 */
export async function settleOrderPayment(
  supabase: SupabaseClient,
  { reference, orderId }: { reference: string; orderId?: string | null },
): Promise<SettleResult> {
  let order: OrderRow | null = null

  const byRef = await supabase.from('orders').select(ORDER_COLUMNS).eq('paystack_reference', reference).maybeSingle()
  if (byRef.error) throw byRef.error
  order = byRef.data as OrderRow | null

  // A retried payment replaces the order's stored reference; a buyer who pays
  // from an older tab still pays for the right order, found by its id.
  if (!order && orderId && UUID.test(orderId)) {
    const byId = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle()
    if (byId.error) throw byId.error
    order = byId.data as OrderRow | null
  }

  if (!order) return { outcome: 'order_not_found' }
  if (order.status !== 'pending') {
    return { outcome: 'already_processed', orderId: order.id, status: order.status }
  }

  // Never trust the webhook body or a redirect for money: ask Paystack
  const payment = await verifyPayment(reference)
  const verdict = assessPayment(order, payment)

  if (verdict === 'not_successful' || verdict === 'already_processed') {
    return { outcome: verdict, orderId: order.id, status: order.status }
  }

  if (verdict === 'amount_mismatch') {
    const received = `${payment.currency} ${(payment.amount / 100).toFixed(2)}`
    const note = `Payment ${reference} did not match this order: received ${received}, expected ${formatCurrency(order.total_amount)}. Not marked as paid.`
    await supabase
      .from('orders')
      .update({ admin_notes: [order.admin_notes, note].filter(Boolean).join('\n') })
      .eq('id', order.id)
    await sendAdminAlert({
      subject: `Payment mismatch on ${order.reference}`,
      heading: 'A payment did not match its order',
      intro: 'The order was left unpaid. Check the transaction in Paystack and refund it if needed.',
      rows: [
        ['Order', order.reference],
        ['Expected', formatCurrency(order.total_amount)],
        ['Received', received],
        ['Paystack reference', reference],
      ],
      cta: { path: '/admin/orders', label: 'Open orders' },
    }).catch(err => console.error('[Payment] mismatch alert failed:', err))
    return { outcome: 'amount_mismatch', orderId: order.id }
  }

  // pending -> paid exactly once, even when the webhook and redirect race
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paystack_reference: reference,
      paystack_transaction_id: payment.id ? String(payment.id) : null,
    })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id')

  if (updateError) throw updateError
  if (!updated || updated.length === 0) {
    return { outcome: 'already_processed', orderId: order.id }
  }

  await notifyOrderPaid(supabase, order.id)
  return { outcome: 'paid', orderId: order.id }
}

// ─── Cart checkouts ───────────────────────────────────────────────────────────

type CheckoutRow = {
  id: string
  reference: string
  status: string
  is_demo: boolean
  total_amount: number
  last_error: string | null
}

const CHECKOUT_COLUMNS = 'id, reference, status, is_demo, total_amount, last_error'

/** "card" or "mobile_money" from Paystack's channel name, for the receipt */
function paystackChannel(channel: string | undefined): 'card' | 'mobile_money' {
  return channel === 'mobile_money' ? 'mobile_money' : 'card'
}

/**
 * The checkout version of settleOrderPayment: a cart paid in one Paystack
 * transaction. Same rules: ask Paystack, compare amount and currency, settle
 * exactly once. Returns order_not_found when the reference isn't a checkout's,
 * so the webhook can fall back to single orders paid before carts existed.
 */
export async function settleCheckoutPayment(
  supabase: SupabaseClient,
  { reference, checkoutId }: { reference: string; checkoutId?: string | null },
): Promise<SettleResult> {
  const byRef = await supabase.from('checkouts').select(CHECKOUT_COLUMNS).eq('paystack_reference', reference).maybeSingle()
  if (byRef.error) throw byRef.error
  let checkout = byRef.data as CheckoutRow | null

  if (!checkout && checkoutId && UUID.test(checkoutId)) {
    const byId = await supabase.from('checkouts').select(CHECKOUT_COLUMNS).eq('id', checkoutId).maybeSingle()
    if (byId.error) throw byId.error
    checkout = byId.data as CheckoutRow | null
  }

  if (!checkout) return { outcome: 'order_not_found' }
  if (checkout.status === 'paid') {
    return { outcome: 'already_processed', orderId: checkout.id, status: checkout.status }
  }

  // Sample checkouts are paid with the test payment, never through Paystack
  if (checkout.is_demo) {
    console.warn(`[Payment] Paystack reference ${reference} points at sample checkout ${checkout.reference}; ignored`)
    return { outcome: 'not_successful', orderId: checkout.id }
  }

  const payment = await verifyPayment(reference)
  const verdict = assessPayment({ status: 'pending', total_amount: checkout.total_amount }, payment)

  if (verdict === 'not_successful') {
    return { outcome: verdict, orderId: checkout.id, status: checkout.status }
  }

  if (verdict === 'amount_mismatch' || checkout.status !== 'pending') {
    // Money arrived that can't settle this checkout: wrong amount, or the
    // buyer cancelled it before paying from another tab. A person decides.
    const received = `${payment.currency} ${(payment.amount / 100).toFixed(2)}`
    const why = verdict === 'amount_mismatch'
      ? `did not match: received ${received}, expected ${formatCurrency(checkout.total_amount)}`
      : `arrived after the checkout was ${checkout.status}`
    const note = `Payment ${reference} ${why}. Not marked as paid.`
    await supabase
      .from('checkouts')
      .update({ last_error: [checkout.last_error, note].filter(Boolean).join('\n') })
      .eq('id', checkout.id)
    await sendAdminAlert({
      subject: `Payment needs checking: ${checkout.reference}`,
      heading: 'A payment could not be matched to its checkout',
      intro: 'No orders were created. Check the transaction in Paystack and refund it if needed.',
      rows: [
        ['Checkout', checkout.reference],
        ['Problem', why],
        ['Expected', formatCurrency(checkout.total_amount)],
        ['Received', received],
        ['Paystack reference', reference],
      ],
      cta: { path: '/admin/orders', label: 'Open orders' },
    }).catch(err => console.error('[Payment] mismatch alert failed:', err))
    return { outcome: 'amount_mismatch', orderId: checkout.id }
  }

  const result = await fulfilCheckout(supabase, checkout.id, {
    channel: paystackChannel(payment.channel),
    label: payment.channel === 'mobile_money' ? 'Mobile money via Paystack' : 'Card via Paystack',
    paystackReference: reference,
    transactionId: payment.id ? String(payment.id) : null,
  })

  return {
    outcome: result.outcome === 'paid' ? 'paid' : 'already_processed',
    orderId: checkout.id,
  }
}

async function notifyOrderPaid(supabase: SupabaseClient, orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      reference, quantity, total_amount, delivery_region,
      buyer:users(email, full_name),
      vendor:vendor_profiles(business_name, user:users(email)),
      product:products(title)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return

  const buyer = order.buyer as unknown as { email?: string; full_name?: string } | null
  const vendor = order.vendor as unknown as { business_name?: string; user?: { email?: string } } | null
  const productTitle = (order.product as unknown as { title?: string } | null)?.title ?? 'Your product'
  const buyerName = buyer?.full_name ?? 'Customer'
  const vendorName = vendor?.business_name ?? 'Vendor'

  const sends: Promise<unknown>[] = []

  if (buyer?.email) {
    sends.push(sendOrderConfirmation(buyer.email, {
      reference: order.reference,
      product_title: productTitle,
      total_amount: order.total_amount,
      vendor_name: vendorName,
      buyer_name: buyerName,
    }))
  }

  if (vendor?.user?.email) {
    sends.push(sendVendorOrderNotification(vendor.user.email, {
      reference: order.reference,
      product_title: productTitle,
      quantity: order.quantity,
      total_amount: order.total_amount,
      buyer_name: buyerName,
    }))
  }

  sends.push(sendAdminAlert({
    subject: `New paid order ${order.reference}`,
    heading: 'A new order has been paid',
    intro: 'The money is held in escrow. The vendor has been asked to confirm within 24 hours.',
    rows: [
      ['Order', order.reference],
      ['Product', productTitle],
      ['Vendor', vendorName],
      ['Amount', formatCurrency(order.total_amount)],
      ['Deliver to', order.delivery_region],
    ],
    cta: { path: '/admin/orders', label: 'Open orders' },
  }))

  const results = await Promise.allSettled(sends)
  results.forEach(r => {
    if (r.status === 'rejected') console.error('[Payment] notification failed:', r.reason)
  })
}
