import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  Clock,
  DollarSign,
  LayoutDashboard,
  User,
  ArrowRight,
  PackageOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { OrderCard } from '@/components/buyer/OrderCard'
import { formatCurrency } from '@/lib/utils'
import type { Order } from '@/types'

export const metadata = { title: 'My Dashboard | SWK Marketplace' }

const BUYER_NAV = [
  { href: '/buyer/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/buyer/orders',    label: 'My Orders',    icon: ShoppingBag },
  { href: '/buyer/profile',   label: 'My Profile',   icon: User },
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
  const totalSpent    = orders
    .filter(o => !['cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

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
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-sand-900">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-sand-500 text-sm mt-1">
              Here&rsquo;s a summary of your activity on SWK Marketplace.
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Total Orders</span>
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-display font-bold text-sand-900">{totalOrders}</p>
            </div>

            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Active Orders</span>
                <div className="w-9 h-9 rounded-lg bg-gold-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gold-600" />
                </div>
              </div>
              <p className="text-3xl font-display font-bold text-sand-900">{activeOrders}</p>
            </div>

            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Total Spent</span>
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-sand-900">{formatCurrency(totalSpent)}</p>
            </div>
          </div>

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
                <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mb-4">
                  <PackageOpen className="w-8 h-8 text-sand-400" />
                </div>
                <h3 className="text-base font-semibold text-sand-700 mb-1">No orders yet</h3>
                <p className="text-sm text-sand-400 mb-6 max-w-xs">
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
