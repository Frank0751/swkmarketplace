import { AdminLayout } from '@/components/admin/AdminLayout'
import { OrderManagement } from '@/components/admin/OrderManagement'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Wallet, AlertTriangle } from 'lucide-react'
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
      product:products(id, title, images, slug)
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

  // Compute summary stats
  const escrowStatuses = ['paid', 'confirmed', 'dispatched']
  const escrowBalance = orders
    .filter(o => escrowStatuses.includes(o.status))
    .reduce((sum, o) => sum + o.total_amount, 0)

  const disputedCount = orders.filter(o => o.status === 'disputed').length
  const totalOrders   = orders.length

  return (
    <AdminLayout title="Order Management">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Total Orders</div>
            <div className="text-2xl font-bold text-sand-900">{totalOrders}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Escrow Balance</div>
            <div className="text-2xl font-bold text-sand-900">{formatCurrency(escrowBalance)}</div>
            <div className="text-xs text-sand-400 mt-0.5">Paid + confirmed + dispatched</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Active Disputes</div>
            <div className="text-2xl font-bold text-sand-900">{disputedCount}</div>
            {disputedCount > 0 && (
              <div className="text-xs text-red-500 mt-0.5">Requires immediate attention</div>
            )}
          </div>
        </div>
      </div>

      <OrderManagement orders={orders} />
    </AdminLayout>
  )
}
