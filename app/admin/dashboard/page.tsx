import { AdminLayout } from '@/components/admin/AdminLayout'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { CATEGORY_META } from '@/types'
import { HBarChart, SplitBar, TrendArea } from '@/components/admin/charts/Charts'
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
    // Vendor stats. region drives the regional-spread chart.
    supabase
      .from('vendor_profiles')
      .select('status, region'),
    // Product stats. category drives the category mix chart.
    supabase
      .from('products')
      .select('status, category'),
    // Order stats. created_at drives the trend chart.
    supabase
      .from('orders')
      .select('status, total_amount, created_at'),
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
  // Refunded money left the platform, so it is not revenue. Disputed orders
  // are unresolved and could still be refunded, so they are excluded too.
  const totalRevenue = orderStats
    .filter(o => !['pending', 'cancelled', 'refunded', 'disputed'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  // Payout totals
  const heldAmount = payoutStats
    .filter(p => p.status === 'held' || p.status === 'pending_release')
    .reduce((sum, p) => sum + (p.gross_amount ?? 0), 0)
  const totalCommission = payoutStats
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + (p.commission_amount ?? 0), 0)

  // ─── Chart data ─────────────────────────────────────────────────────────────

  // Where orders are sitting right now. Ordered by lifecycle so a pile-up at one
  // stage is visible as a bottleneck rather than just a number.
  const PIPELINE: { key: string; label: string }[] = [
    { key: 'paid',       label: 'Awaiting vendor' },
    { key: 'confirmed',  label: 'Being prepared' },
    { key: 'dispatched', label: 'Out for delivery' },
    { key: 'delivered',  label: 'Awaiting payout' },
    { key: 'released',   label: 'Completed' },
  ]
  const pipelineData = PIPELINE.map(({ key, label }) => ({
    label,
    value: orderCounts[key] ?? 0,
  }))

  // Money currently held versus already paid out, and the commission earned.
  const releasedNet = payoutStats
    .filter(p => p.status === 'released')
    .reduce((s, p) => s + (p.net_amount ?? 0), 0)
  const escrowParts = [
    { label: 'Held in escrow', value: heldAmount,      display: formatCurrency(heldAmount),      color: '#3B6D11' },
    { label: 'Paid to vendors', value: releasedNet,    display: formatCurrency(releasedNet),     color: '#BA7517' },
    { label: 'SWK commission',  value: totalCommission, display: formatCurrency(totalCommission), color: '#6B6454' },
  ]

  // Orders per week over the last 8 weeks.
  const WEEKS = 8
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const orderTimes = orderStats
    .map(o => new Date(o.created_at as string).getTime())
    .filter(t => !Number.isNaN(t))
  const trendPoints = Array.from({ length: WEEKS }, (_, i) => {
    // Bucket i is the week [start, end), oldest first, ending at now.
    const start = now - (WEEKS - i) * weekMs
    const end   = start + weekMs
    const count = orderTimes.filter(t => t >= start && t < end).length
    const d = new Date(start)
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: count }
  })

  // Listings by category, biggest first: a magnitude comparison, so one hue.
  const categoryCounts = productStats.reduce((acc: Record<string, number>, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})
  const categoryData = Object.entries(categoryCounts)
    .map(([key, value]) => ({
      label: CATEGORY_META[key as keyof typeof CATEGORY_META]?.label ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value)

  // Vendors by region, to show whether the platform is reaching beyond Accra.
  const regionCounts = vendorStats.reduce((acc: Record<string, number>, v) => {
    if (v.region) acc[v.region] = (acc[v.region] ?? 0) + 1
    return acc
  }, {})
  const regionData = Object.entries(regionCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Application and review queues. Status, so colour always travels with a label.
  const vendorPipeline = [
    { label: 'Approved', value: vendorCounts.approved ?? 0, color: '#3B6D11' },
    { label: 'Pending',  value: vendorCounts.pending  ?? 0, color: '#BA7517' },
    { label: 'Rejected', value: vendorCounts.rejected ?? 0, color: '#DC2626' },
  ]
  const listingPipeline = [
    { label: 'Approved',      value: productCounts.approved ?? 0,       color: '#3B6D11' },
    { label: 'Pending review', value: productCounts.pending_review ?? 0, color: '#BA7517' },
    { label: 'Rejected',      value: productCounts.rejected ?? 0,       color: '#DC2626' },
  ]

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
                <div className="text-xs font-medium text-sand-600">{card.label}</div>
                <div className="text-2xl font-bold text-sand-900 mt-0.5 leading-tight">{card.value}</div>
                <div className="text-xs text-sand-600 mt-1">{card.sub}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-sand-300 group-hover:text-green-600 transition-colors flex-shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>

      {/* ── Analytics ── */}
      <section aria-labelledby="analytics-heading" className="mb-8">
        <h2 id="analytics-heading" className="text-lg font-display font-semibold text-sand-900 mb-1">
          At a glance
        </h2>
        <p className="text-sm text-sand-600 mb-5">
          Where orders and money are sitting right now, and how the marketplace is growing.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <HBarChart
            title="Order pipeline"
            caption="Where every live order is right now. A build-up at one stage points to the bottleneck."
            data={pipelineData}
            ramp
            unit="Orders"
            emptyMessage="No orders yet. This fills in as buyers start purchasing."
          />
          <TrendArea
            title="Orders per week"
            caption="New orders placed over the last 8 weeks."
            points={trendPoints}
            emptyMessage="Not enough history yet. The trend appears once orders start coming in."
          />
        </div>

        <div className="mb-5">
          <SplitBar
            title="Where the money is"
            caption="Funds held in escrow versus already paid out, and the commission SWK Ghana has earned."
            parts={escrowParts}
            emptyMessage="No payments processed yet. This shows the escrow position once orders are paid."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <HBarChart
            title="Vendor applications"
            caption="The approval queue. Pending applications are people waiting to start trading."
            data={vendorPipeline}
            unit="Vendors"
            emptyMessage="No vendor applications yet."
          />
          <HBarChart
            title="Listing reviews"
            caption="Products awaiting an SDG 12 check before they can go live."
            data={listingPipeline}
            unit="Listings"
            emptyMessage="No listings submitted yet."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HBarChart
            title="Listings by category"
            caption="What vendors are actually selling."
            data={categoryData}
            unit="Listings"
            emptyMessage="No approved listings yet."
          />
          <HBarChart
            title="Vendors by region"
            caption="Top regions. Shows whether the platform is reaching beyond Greater Accra."
            data={regionData}
            unit="Vendors"
            emptyMessage="No vendor regions recorded yet."
          />
        </div>
      </section>

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
            <div className="px-5 py-8 text-center text-sm text-sand-600">
              No pending applications
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {recentVendors.map(vendor => {
                const catMeta = CATEGORY_META[vendor.category]
                return (
                  <div key={vendor.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-base">
                      
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-sand-900 truncate">{vendor.business_name}</div>
                      <div className="text-xs text-sand-600 truncate">{vendor.user?.full_name} · {catMeta?.label}</div>
                    </div>
                    <div className="text-xs text-sand-600 flex-shrink-0">
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
            <div className="px-5 py-8 text-center text-sm text-sand-600">
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
                    <div className="text-xs text-sand-600 truncate mt-0.5">
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
            <div className="px-5 py-8 text-center text-sm text-sand-600">
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
                        
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-sand-900 truncate">{listing.title}</div>
                      <div className="text-xs text-sand-600 truncate">
                        {/* @ts-ignore - joined data */}
                        {listing.vendor?.business_name} · {catMeta?.label}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-sand-900 flex-shrink-0">
                      {formatCurrency(listing.price_ghs)}
                    </div>
                    <div className="text-xs text-sand-600 flex-shrink-0">
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
