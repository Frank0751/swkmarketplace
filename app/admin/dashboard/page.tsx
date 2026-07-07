import { AdminLayout } from '@/components/admin/AdminLayout'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { CATEGORY_META } from '@/types'
import Link from 'next/link'
import {
  Users,
  Package,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Order, VendorProfile, Product, User } from '@/types'

export const metadata = { title: 'Admin Dashboard' }
export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()

  const [
    { data: vendorStats },
    { data: productStats },
    { data: orderStats },
    { data: payoutStats },
    { data: recentVendors },
    { data: recentOrders },
    { data: pendingListings },
  ] = await Promise.all([
    // Vendor stats
    supabase
      .from('vendor_profiles')
      .select('status'),
    // Product stats
    supabase
      .from('products')
      .select('status'),
    // Order stats
    supabase
      .from('orders')
      .select('status, total_amount'),
    // Payout stats
    supabase
      .from('payouts')
      .select('status, gross_amount, net_amount, commission_amount'),
    // Recent pending vendors
    supabase
      .from('vendor_profiles')
      .select('*, user:users(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    // Recent orders needing attention
    supabase
      .from('orders')
      .select('*, buyer:users(*), vendor:vendor_profiles(business_name), product:products(title)')
      .in('status', ['paid', 'confirmed', 'disputed'])
      .order('created_at', { ascending: false })
      .limit(5),
    // Pending listings
    supabase
      .from('products')
      .select('*, vendor:vendor_profiles(business_name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    vendorStats: vendorStats ?? [],
    productStats: productStats ?? [],
    orderStats: orderStats ?? [],
    payoutStats: payoutStats ?? [],
    recentVendors: (recentVendors ?? []) as (VendorProfile & { user: User })[],
    recentOrders: (recentOrders ?? []) as Order[],
    pendingListings: (pendingListings ?? []) as Product[],
  }
}

export default async function AdminDashboardPage() {
  const {
    vendorStats,
    productStats,
    orderStats,
    payoutStats,
    recentVendors,
    recentOrders,
    pendingListings,
  } = await getDashboardData()

  // Compute vendor counts
  const vendorCounts = vendorStats.reduce((acc: Record<string, number>, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1
    return acc
  }, {})

  // Compute product counts
  const productCounts = productStats.reduce((acc: Record<string, number>, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  // Compute order counts + revenue
  const orderCounts = orderStats.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})
  const totalRevenue = orderStats
    .filter(o => !['pending', 'cancelled'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  // Payout totals
  const heldAmount = payoutStats
    .filter(p => p.status === 'held' || p.status === 'pending_release')
    .reduce((sum, p) => sum + (p.gross_amount ?? 0), 0)
  const totalCommission = payoutStats
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + (p.commission_amount ?? 0), 0)

  const statCards = [
    {
      label: 'Total Vendors',
      value: vendorStats.length,
      sub: `${vendorCounts.pending ?? 0} pending review`,
      icon: Users,
      color: 'bg-green-100 text-green-600',
      href: '/admin/vendors',
    },
    {
      label: 'Active Listings',
      value: productCounts.approved ?? 0,
      sub: `${productCounts.pending_review ?? 0} pending review`,
      icon: Package,
      color: 'bg-teal-100 text-teal-600',
      href: '/admin/listings',
    },
    {
      label: 'Total Orders',
      value: orderStats.length,
      sub: `${orderCounts.paid ?? 0} paid · ${orderCounts.dispatched ?? 0} dispatched`,
      icon: ShoppingCart,
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/orders',
    },
    {
      label: 'Escrow Balance',
      value: formatCurrency(heldAmount),
      sub: `${payoutStats.filter(p => p.status === 'held' || p.status === 'pending_release').length} pending payouts`,
      icon: Wallet,
      color: 'bg-gold-100 text-gold-600',
      href: '/admin/payouts',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      sub: 'All paid orders',
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/orders',
    },
    {
      label: 'Commission Earned',
      value: formatCurrency(totalCommission),
      sub: '15% of released payouts',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      href: '/admin/payouts',
    },
  ]

  return (
    <AdminLayout title="Dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border border-sand-200 p-5 flex items-start gap-4 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0', card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-sand-500">{card.label}</div>
                <div className="text-2xl font-bold text-sand-900 mt-0.5 leading-tight">{card.value}</div>
                <div className="text-xs text-sand-400 mt-1">{card.sub}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-sand-300 group-hover:text-green-600 transition-colors flex-shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending vendor applications */}
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sand-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-600" />
              <h2 className="font-semibold text-sand-900 text-sm">Pending Vendor Applications</h2>
              {(vendorCounts.pending ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold bg-gold-400 text-white rounded-full">
                  {vendorCounts.pending}
                </span>
              )}
            </div>
            <Link href="/admin/vendors" className="text-xs text-green-600 hover:text-green-700 font-medium">
              View all
            </Link>
          </div>

          {recentVendors.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-sand-400">
              No pending applications
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {recentVendors.map(vendor => {
                const catMeta = CATEGORY_META[vendor.category]
                return (
                  <div key={vendor.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-base">
                      {catMeta?.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-sand-900 truncate">{vendor.business_name}</div>
                      <div className="text-xs text-sand-400 truncate">{vendor.user?.full_name} · {catMeta?.label}</div>
                    </div>
                    <div className="text-xs text-sand-400 flex-shrink-0">
                      {formatRelativeTime(vendor.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-sand-100 bg-sand-50">
            <Link
              href="/admin/vendors?tab=pending"
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              Review all pending applications <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Orders needing attention */}
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sand-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gold-600" />
              <h2 className="font-semibold text-sand-900 text-sm">Orders Needing Attention</h2>
            </div>
            <Link href="/admin/orders" className="text-xs text-green-600 hover:text-green-700 font-medium">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-sand-400">
              No orders need attention
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {recentOrders.map(order => (
                <div key={order.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-green-700">{order.reference}</span>
                      <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-medium', ORDER_STATUS_COLORS[order.status])}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="text-xs text-sand-400 truncate mt-0.5">
                      {/* @ts-ignore - joined data */}
                      {order.buyer?.full_name} · {order.product?.title}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-sand-900 flex-shrink-0">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-sand-100 bg-sand-50">
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              Manage all orders <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Pending listings */}
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sand-200">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600" />
              <h2 className="font-semibold text-sand-900 text-sm">Pending Listing Reviews</h2>
              {(productCounts.pending_review ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold bg-teal-600 text-white rounded-full">
                  {productCounts.pending_review}
                </span>
              )}
            </div>
            <Link href="/admin/listings" className="text-xs text-green-600 hover:text-green-700 font-medium">
              View all
            </Link>
          </div>

          {pendingListings.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-sand-400">
              No listings pending review
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {pendingListings.map(listing => {
                const catMeta = CATEGORY_META[listing.category]
                return (
                  <div key={listing.id} className="px-5 py-3 flex items-center gap-3">
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-sand-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0 text-base">
                        {catMeta?.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-sand-900 truncate">{listing.title}</div>
                      <div className="text-xs text-sand-400 truncate">
                        {/* @ts-ignore - joined data */}
                        {listing.vendor?.business_name} · {catMeta?.label}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-sand-900 flex-shrink-0">
                      {formatCurrency(listing.price_ghs)}
                    </div>
                    <div className="text-xs text-sand-400 flex-shrink-0">
                      {formatRelativeTime(listing.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-sand-100 bg-sand-50">
            <Link
              href="/admin/listings?tab=pending_review"
              className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              Review all pending listings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
