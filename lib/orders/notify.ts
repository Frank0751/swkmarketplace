import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sendOrderConfirmedByVendor,
  sendOrderDispatched,
  sendDeliveryConfirmed,
  sendRefundIssued,
  sendDisputeReceived,
  sendVendorDisputeNotice,
  sendAdminAlert,
} from '@/lib/email/brevo'
import { formatCurrency } from '@/lib/utils'
import type { OrderStatus } from '@/types'

/**
 * Emails for a status change. Read with the service role: under the caller's
 * own session, RLS hides the other party's email address, so a buyer
 * confirming delivery never triggered the vendor's email, and a vendor
 * dispatching never triggered the buyer's.
 *
 * Sample orders still email the buyer, so a demo shows the real messages, but
 * never alert the SWK team: a sample payout has no money behind it.
 */
export async function notifyTransition(
  admin: SupabaseClient,
  orderId: string,
  status: OrderStatus,
  note?: string,
) {
  const { data: o } = await admin
    .from('orders')
    .select(`
      reference, total_amount, estimated_delivery, is_demo,
      buyer:users(email, full_name),
      vendor:vendor_profiles(business_name, user:users(email)),
      product:products(title),
      payout:payouts(net_amount)
    `)
    .eq('id', orderId)
    .single()

  if (!o) return

  const buyer = o.buyer as unknown as { email?: string; full_name?: string } | null
  const vendor = o.vendor as unknown as { business_name?: string; user?: { email?: string } | null } | null
  const productTitle = (o.product as unknown as { title?: string } | null)?.title ?? 'Your product'
  const payoutRaw = o.payout as unknown
  const payout = (Array.isArray(payoutRaw) ? payoutRaw[0] : payoutRaw) as { net_amount?: number } | null
  const vendorName = vendor?.business_name ?? 'The vendor'
  const alertAdmin = !o.is_demo

  const sends: Promise<unknown>[] = []

  switch (status) {
    case 'confirmed':
      if (buyer?.email) {
        sends.push(sendOrderConfirmedByVendor(buyer.email, {
          reference: o.reference,
          product_title: productTitle,
          vendor_name: vendorName,
        }))
      }
      break

    case 'dispatched':
      if (buyer?.email) {
        sends.push(sendOrderDispatched(buyer.email, {
          reference: o.reference,
          product_title: productTitle,
          estimated_delivery: o.estimated_delivery ?? undefined,
        }))
      }
      break

    case 'delivered':
      if (vendor?.user?.email) {
        sends.push(sendDeliveryConfirmed(vendor.user.email, {
          reference: o.reference,
          net_amount: payout?.net_amount ?? 0,
        }))
      }
      if (alertAdmin) {
        sends.push(sendAdminAlert({
          subject: `Payout ready: ${o.reference}`,
          heading: 'A payout is ready to release',
          intro: 'Delivery is confirmed. Send the vendor their share to their payout account, then mark it released.',
          rows: [
            ['Order', o.reference],
            ['Vendor', vendorName],
            ['Vendor receives', payout?.net_amount != null ? formatCurrency(payout.net_amount) : null],
          ],
          cta: { path: '/admin/payouts', label: 'Open payouts' },
        }))
      }
      break

    case 'disputed':
      if (buyer?.email) sends.push(sendDisputeReceived(buyer.email, { reference: o.reference }))
      if (vendor?.user?.email) {
        sends.push(sendVendorDisputeNotice(vendor.user.email, {
          reference: o.reference,
          product_title: productTitle,
        }))
      }
      if (alertAdmin) {
        sends.push(sendAdminAlert({
          subject: `Problem reported: ${o.reference}`,
          heading: 'A buyer reported a problem',
          intro: 'The payment is on hold. Speak to the buyer and the vendor, then resolve the order as delivered or refunded.',
          rows: [
            ['Order', o.reference],
            ['Product', productTitle],
            ['Vendor', vendorName],
            ['Buyer', buyer?.full_name],
            ['Amount held', formatCurrency(o.total_amount)],
          ],
          quote: note,
          cta: { path: '/admin/orders', label: 'Open orders' },
        }))
      }
      break

    case 'refunded':
      if (buyer?.email) {
        sends.push(sendRefundIssued(buyer.email, { reference: o.reference, amount: o.total_amount }))
      }
      break
  }

  const results = await Promise.allSettled(sends)
  results.forEach(r => {
    if (r.status === 'rejected') console.error('[Order email]', r.reason)
  })
}
