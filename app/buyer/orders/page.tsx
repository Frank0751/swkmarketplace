import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  LayoutDashboard,
  User,
  PackageOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { OrderCard } from '@/components/buyer/OrderCard'
import type { Order, OrderStatus } from '@/types'

export const metadata = { title: 'My Orders — SWK Marketplace' }

const BUYER_NAV = [
  { href: '/buyer/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/buyer/orders',    label: 'My Orders',  icon: ShoppingBag },
  { href: '/buyer/profile',   label: 'My Profile', icon: User },
]

type TabKey = 'all' | 'active' | 'delivered' | 'cancelled'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All Orders' },
  { key: 'active',    label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const ACTIVE_STATUSES: OrderStatus[]    = ['paid', 'confirmed', 'dispatched']
const DELIVERED_STATUSES: OrderStatus[] = ['delivered', 'released']
const CANCELLED_STATUSES: OrderStatus[] = ['cancelled', 'refunded', 'disputed']

function filterOrders(orders: Order[], tab: TabKey): Order[] {
  switch (tab) {
    case 'active':    return orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    case 'delivered': return orders.filter(o => DELIVERED_STATUSES.includes(o.status))
    case 'cancelled': return orders.filter(o => CANCELLED_STATUSES.includes(o.status))
    default:          return orders
  }
}

interface Props {
  searchParams: { tab?: string; page?: string }
}

export default async function BuyerOrdersPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/buyer/orders')
  }

  const activeTab = (searchParams.tab ?? 'all') as TabKey
  const page      = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const pageSize  = 10

  // Fetch ALL orders so we can count per tab
  const { data: allOrdersRaw } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, slug, images, price_ghs),
      vendor:vendor_profiles(id, business_name, logo_url)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  const allOrders = (allOrdersRaw ?? []) as unknown as Order[]
  const filtered  = filterOrders(allOrders, activeTab)
  const total     = filtered.length
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const hasMore   = page * pageSize < total

  const counts: Record<TabKey, number> = {
    all:       allOrders.length,
    active:    filterOrders(allOrders, 'active').length,
    delivered: filterOrders(allOrders, 'delivered').length,
    cancelled: filterOrders(allOrders, 'cancelled').length,
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-64px)] bg-white border-r border-sand-200 p-4 gap-1 sticky top-16 self-start">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest px-3 mb-2">
            Buyer Menu
          </p>
          {BUYER_NAV.map(item => {
            const Icon = item.icon
            const isActive = item.href === '/buyer/orders'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-sand-700 hover:bg-sand-100 hover:text-sand-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
          <div className="mt-auto pt-4 border-t border-sand-100">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Browse Products
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold text-sand-900">My Orders</h1>
            <p className="text-sand-500 text-sm mt-1">Track and manage all your purchases.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => {
              const count  = counts[tab.key]
              const active = activeTab === tab.key
              return (
                <Link
                  key={tab.key}
                  href={`/buyer/orders?tab=${tab.key}`}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-sand-600 border-sand-200 hover:border-green-200 hover:text-green-700'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                      active ? 'bg-white/20 text-white' : 'bg-sand-100 text-sand-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Orders list */}
          {paginated.length === 0 ? (
            <div className="bg-white rounded-xl border border-sand-200 shadow-card">
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mb-4">
                  <PackageOpen className="w-8 h-8 text-sand-400" />
                </div>
                <h3 className="text-base font-semibold text-sand-700 mb-1">
                  {activeTab === 'all' ? 'No orders yet' : `No ${activeTab} orders`}
                </h3>
                <p className="text-sm text-sand-400 mb-6 max-w-xs">
                  {activeTab === 'all'
                    ? "You haven't placed any orders. Start shopping for sustainable products."
                    : `You don't have any ${activeTab} orders right now.`}
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-sand-200 shadow-card divide-y divide-sand-100">
                {paginated.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* Load more / pagination */}
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <Link
                    href={`/buyer/orders?tab=${activeTab}&page=${page + 1}`}
                    className="px-6 py-2.5 bg-white border border-sand-200 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-50 hover:border-sand-300 transition-colors shadow-sm"
                  >
                    Show more orders
                  </Link>
                </div>
              )}

              <p className="text-xs text-sand-400 text-center mt-3">
                Showing {paginated.length} of {total} orders
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
