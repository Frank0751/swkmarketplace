import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Store,
  DollarSign,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  PackageOpen,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { ShareStoreLink } from '@/components/vendor/ShareStoreLink'
import { formatCurrency, formatDate, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, cn } from '@/lib/utils'
import type { Order, VendorProfile } from '@/types'

export const metadata = { title: 'Vendor Dashboard, SWK Marketplace' }

const VENDOR_NAV = [
  { href: '/vendor/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/vendor/listings',   label: 'My Listings',  icon: Package },
  { href: '/vendor/listings/new', label: 'Add Listing', icon: PlusCircle },
  { href: '/vendor/store',      label: 'My Store Page', icon: Store },
]

export default async function VendorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/vendor/dashboard')
  }

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userProfile?.role === 'buyer') redirect('/buyer/dashboard')
  if (userProfile?.role === 'admin') redirect('/admin/dashboard')

  // Fetch vendor profile
  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // If no vendor profile at all, redirect to apply
  if (!vendorProfile) {
    redirect('/vendor/apply')
  }

  const vendor = vendorProfile as VendorProfile

  // Fetch stats (only if approved)
  let recentOrders: Order[] = []
  let pendingPayouts = 0
  let productCounts = { total: 0, approved: 0, pending: 0 }

  if (vendor.status === 'approved') {
    const [ordersRes, productsRes, payoutsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          product:products(id, title, slug, images, price_ghs),
          buyer:users(id, full_name, email)
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('products')
        .select('id, status')
        .eq('vendor_id', vendor.id),

      supabase
        .from('payouts')
        .select('net_amount, status')
        .eq('vendor_id', vendor.id)
        .in('status', ['held', 'pending_release']),
    ])

    recentOrders = (ordersRes.data ?? []) as unknown as Order[]
    const products = productsRes.data ?? []
    productCounts = {
      total:    products.length,
      approved: products.filter(p => p.status === 'approved').length,
      pending:  products.filter(p => p.status === 'pending_review').length,
    }
    pendingPayouts = (payoutsRes.data ?? []).reduce((sum, p) => sum + (p.net_amount ?? 0), 0)
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-64px)] bg-white border-r border-sand-200 p-4 gap-1 sticky top-16 self-start">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest px-3 mb-2">
            Vendor Menu
          </p>
          {VENDOR_NAV.map(item => {
            const Icon = item.icon
            const isAdd = item.href === '/vendor/listings/new'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isAdd
                    ? 'bg-green-600 text-white hover:bg-green-700 mt-1'
                    : 'text-sand-700 hover:bg-sand-100 hover:text-sand-900'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold text-sand-900">
              {vendor.status === 'approved'
                ? `Welcome back, ${vendor.business_name}!`
                : `Hello, ${vendor.business_name}`}
            </h1>
            <p className="text-sand-500 text-sm mt-1">
              {vendor.status === 'approved'
                ? "Here's what's happening with your store today."
                : 'Your vendor application status is shown below.'}
            </p>
          </div>

          {/* ── PENDING BANNER ── */}
          {vendor.status === 'pending' && (
            <div className="bg-gold-50 border border-gold-100 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-gold-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-display font-semibold text-gold-800 mb-1">
                    Application Under Review
                  </h2>
                  <p className="text-sm text-gold-700 mb-4">
                    Your vendor application was submitted on{' '}
                    <strong>{formatDate(vendor.created_at)}</strong>. Our team reviews applications
                    within 2–3 business days. We&rsquo;ll notify you by email once a decision is made.
                  </p>
                  {/* Mini timeline */}
                  <div className="flex items-center gap-0">
                    {[
                      { label: 'Applied', done: true },
                      { label: 'Under Review', done: true, active: true },
                      { label: 'Decision', done: false },
                      { label: 'Start Selling', done: false },
                    ].map((s, i, arr) => (
                      <div key={i} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                            s.done && !s.active && 'bg-gold-400 border-gold-400 text-white',
                            s.active  && 'bg-white border-gold-400 text-gold-600 ring-2 ring-gold-200',
                            !s.done   && 'bg-sand-100 border-sand-200 text-sand-400',
                          )}>
                            {s.done && !s.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                          </div>
                          <span className="text-xs text-gold-700 mt-1 text-center w-16">{s.label}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={cn('h-0.5 w-8 mx-1 mb-5', s.done ? 'bg-gold-300' : 'bg-sand-200')} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REJECTED BANNER ── */}
          {vendor.status === 'rejected' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-display font-semibold text-red-800 mb-1">
                    Application Rejected
                  </h2>
                  {vendor.rejection_reason && (
                    <div className="text-sm text-red-700 mb-3 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                      <strong>Reason: </strong>{vendor.rejection_reason}
                    </div>
                  )}
                  <p className="text-sm text-red-600 mb-4">
                    You can update your application and resubmit. Make sure your business clearly
                    aligns with SDG 12 and our sustainability requirements.
                  </p>
                  <Link
                    href="/vendor/apply"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Resubmit Application <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── SUSPENDED BANNER ── */}
          {vendor.status === 'suspended' && (
            <div className="bg-sand-100 border border-sand-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-sand-500 flex-shrink-0" />
                <div>
                  <h2 className="text-base font-display font-semibold text-sand-800 mb-1">Account Suspended</h2>
                  <p className="text-sm text-sand-600 mb-2">
                    Your vendor account has been suspended. Please contact SWK Ghana for more information.
                  </p>
                  <a
                    href="mailto:info@swkghana.org"
                    className="text-sm text-green-600 hover:underline font-medium"
                  >
                    info@swkghana.org
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── APPROVED: stats + orders ── */}
          {vendor.status === 'approved' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Total Sales</span>
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold text-sand-900">
                    {formatCurrency(vendor.total_sales ?? 0)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Active Listings</span>
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Package className="w-4 h-4 text-teal-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-display font-bold text-sand-900">{productCounts.approved}</p>
                </div>

                <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Total Orders</span>
                    <div className="w-9 h-9 rounded-lg bg-gold-50 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-gold-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-display font-bold text-sand-900">{vendor.total_sales > 0 ? '-' : 0}</p>
                </div>

                <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-sand-500 uppercase tracking-wide">Pending Payout</span>
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold text-sand-900">{formatCurrency(pendingPayouts)}</p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-3 mb-6">
                <Link
                  href="/vendor/listings/new"
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Add New Listing
                </Link>
                <Link
                  href="/vendor/listings"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-50 transition-colors shadow-card"
                >
                  <Package className="w-4 h-4" /> Manage Listings
                  {productCounts.pending > 0 && (
                    <span className="text-xs bg-gold-100 text-gold-700 rounded-full px-1.5 py-0.5 font-semibold">
                      {productCounts.pending} pending
                    </span>
                  )}
                </Link>
                <Link
                  href={`/store/${vendor.slug ?? vendor.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-50 transition-colors shadow-card"
                >
                  <ExternalLink className="w-4 h-4" /> View My Store
                </Link>
              </div>

              {/* Shareable store link, the vendor's mini-website */}
              <div className="mb-8">
                <ShareStoreLink
                  slug={vendor.slug ?? vendor.id}
                  businessName={vendor.business_name}
                  variant="card"
                />
                <p className="mt-2 text-xs text-sand-400">
                  Want to add your story, founders and team to your store page?{' '}
                  <Link href="/vendor/store" className="text-green-600 font-semibold hover:underline">
                    Edit your store profile →
                  </Link>
                </p>
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-xl border border-sand-200 shadow-card">
                <div className="flex items-center justify-between px-6 py-4 border-b border-sand-100">
                  <h2 className="text-base font-display font-semibold text-sand-900">Recent Orders</h2>
                  {recentOrders.length > 0 && (
                    <Link
                      href="/vendor/orders"
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {recentOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-sand-100 flex items-center justify-center mb-3">
                      <PackageOpen className="w-7 h-7 text-sand-400" />
                    </div>
                    <p className="text-sm font-semibold text-sand-700 mb-1">No orders yet</p>
                    <p className="text-xs text-sand-400">
                      Orders will appear here once buyers purchase your products.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-sand-100">
                    {recentOrders.map(order => {
                      const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'bg-sand-100 text-sand-600'
                      const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status
                      return (
                        <div key={order.id} className="flex items-center gap-4 px-6 py-4 hover:bg-sand-50 transition-colors">
                          {/* Product image */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-sand-100 border border-sand-200">
                            {order.product?.images?.[0] ? (
                              <img
                                src={order.product.images[0]}
                                alt={order.product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-sand-400" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-sand-900 line-clamp-1">
                              {order.product?.title ?? 'Product'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-sand-400 font-mono">{order.reference}</span>
                              <span className="text-sand-200">·</span>
                              <span className="text-xs text-sand-400">{formatRelativeTime(order.created_at)}</span>
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-sand-900">{formatCurrency(order.total_amount)}</p>
                            <span className={cn('status-badge text-xs mt-1', order.status, statusColor)}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile nav */}
          <div className="md:hidden mt-6 bg-white rounded-xl border border-sand-200 p-4 space-y-1 shadow-card">
            {VENDOR_NAV.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors"
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </Link>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
