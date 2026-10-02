import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  LayoutDashboard,
  User,
  ArrowRight,
  CreditCard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { OrderCard } from '@/components/buyer/OrderCard'
import { formatCurrency } from '@/lib/utils'
import type { Order } from '@/types'

export const metadata = { title: 'My Dashboard' }

const BUYER_NAV = [
  { href: '/buyer/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/buyer/orders',    label: 'My Orders',    icon: ShoppingBag },
  { href: '/buyer/payment-methods', label: 'Payment methods', icon: CreditCard },
  { href: '/buyer/settings',  label: 'Account settings', icon: User },
]

export default async function BuyerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/buyer/dashboard')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'vendor') redirect('/vendor/dashboard')
  if (profile?.role === 'admin')  redirect('/admin/dashboard')

  // Fetch all orders for stats
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .eq('buyer_id', user.id)

  // Fetch 5 most recent orders with product+vendor
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, slug, images, price_ghs),
      vendor:vendor_profiles(id, business_name, logo_url)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const orders        = allOrders ?? []
  const recent        = (recentOrders ?? []) as unknown as Order[]
  const totalOrders   = orders.length
  const activeOrders  = orders.filter(o => ['paid', 'confirmed', 'dispatched'].includes(o.status)).length
  // 'pending' orders are awaiting payment, so counting them as spent overstated
  // the figure. Cancelled and refunded money is likewise not spent.
  const totalSpent    = orders
    .filter(o => !['pending', 'cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-64px)] bg-white border-r border-sand-200 p-4 gap-1 sticky top-16 self-start">
          <p className="text-xs font-semibold text-sand-600 uppercase tracking-widest px-3 mb-2">
            Buyer Menu
          </p>
          {BUYER_NAV.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 hover:text-sand-900 transition-colors"
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
        <main id="main" className="flex-1 p-6 md:p-8 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <p className="eyebrow mb-2">Your account</p>
            <h1 className="text-3xl font-display font-bold tracking-tight text-sand-900">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sand-600 text-sm mt-1">
              Here&rsquo;s a summary of your activity on SWK Marketplace.
            </p>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total orders', value: String(totalOrders) },
              { label: 'In progress', value: String(activeOrders) },
              { label: 'Total spent', value: formatCurrency(totalSpent) },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col bg-white rounded-xl border border-sand-200 border-t-4 border-t-green-600 p-5 shadow-card">
                <dt className="eyebrow order-1">{stat.label}</dt>
                <dd className="order-2 mt-2 text-3xl font-display font-bold tracking-tight text-sand-900">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {/* Recent orders */}
          <div className="bg-white rounded-xl border border-sand-200 shadow-card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
              <h2 className="text-base font-display font-semibold text-sand-900">Recent Orders</h2>
              {recent.length > 0 && (
                <Link
                  href="/buyer/orders"
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <h3 className="text-lg font-bold text-sand-900 mb-1">No orders yet</h3>
                <p className="text-sm text-sand-600 mb-6 max-w-xs">
                  You haven&rsquo;t placed any orders yet. Start shopping for sustainable products.
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  Start Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-sand-100">
                {recent.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden mt-6 bg-white rounded-xl border border-sand-200 p-4 space-y-1 shadow-card">
            {BUYER_NAV.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
