import { AdminLayout } from '@/components/admin/AdminLayout'
import { OrderManagement } from '@/components/admin/OrderManagement'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { isConfirmationOverdue, CONFIRMATION_WINDOW_DAYS } from '@/lib/marketplace/orders'
import type { Order } from '@/types'

export const metadata = { title: 'Order Management' }
export const dynamic = 'force-dynamic'

async function getOrderData() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:users(*),
      vendor:vendor_profiles(id, business_name, user:users(email)),
      product:products(id, title, images, slug),
      checkout:checkouts(id, reference, payment_label, payment_channel, paid_at, total_amount)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return { orders: [] }
  }

  return { orders: (orders ?? []) as Order[] }
}

export default async function AdminOrdersPage() {
  const { orders } = await getOrderData()

  // Compute summary stats.
  // 'delivered' belongs here: the buyer has confirmed but the admin has not
  // released yet, so the money is still held. Omitting it made this figure
  // disagree with the escrow total on the admin dashboard, which derives the
  // same number from payouts (held + pending_release).
  const escrowStatuses = ['paid', 'confirmed', 'dispatched', 'delivered']
  const escrowBalance = orders
    .filter(o => escrowStatuses.includes(o.status))
    .reduce((sum, o) => sum + o.total_amount, 0)

  const disputedCount = orders.filter(o => o.status === 'disputed').length
  const overdueCount  = orders.filter(o => isConfirmationOverdue(o)).length
  const totalOrders   = orders.length

  return (
    <AdminLayout title="Order Management">
      {/* Summary */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total orders', value: String(totalOrders), note: 'Every order placed', alert: false },
          { label: 'Held in escrow', value: formatCurrency(escrowBalance), note: 'Paid, not yet released', alert: false },
          { label: 'Problems reported', value: String(disputedCount), note: disputedCount > 0 ? 'Needs attention now' : 'None open', alert: disputedCount > 0 },
          { label: `Awaiting buyer ${CONFIRMATION_WINDOW_DAYS}+ days`, value: String(overdueCount), note: 'Dispatched, not confirmed', alert: false },
        ].map(stat => (
          <div
            key={stat.label}
            className={`flex flex-col bg-white rounded-xl border border-sand-200 border-t-4 p-4 ${stat.alert ? 'border-t-red-600' : 'border-t-green-600'}`}
          >
            <dt className="eyebrow text-sand-600 order-1">{stat.label}</dt>
            <dd className="order-2 mt-2 text-2xl font-bold tracking-tight text-sand-900">{stat.value}</dd>
            <dd className={`order-3 text-xs mt-1 ${stat.alert ? 'text-red-700 font-semibold' : 'text-sand-600'}`}>{stat.note}</dd>
          </div>
        ))}
      </dl>

      <OrderManagement orders={orders} />
    </AdminLayout>
  )
}
