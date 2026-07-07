import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  User,
  ShoppingBag,
  Eye,
  ShoppingCart,
  MoreHorizontal,
  Pencil,
  PackageOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product, ProductStatus } from '@/types'

export const metadata = { title: 'My Listings, SWK Marketplace' }

const VENDOR_NAV = [
  { href: '/vendor/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/vendor/listings',     label: 'My Listings',  icon: Package },
  { href: '/vendor/listings/new', label: 'Add Listing',  icon: PlusCircle },
  { href: '/vendor/orders',       label: 'Orders',       icon: ShoppingBag },
  { href: '/vendor/profile',      label: 'Profile',      icon: User },
]

type TabKey = 'all' | 'approved' | 'pending_review' | 'draft' | 'rejected'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'approved',      label: 'Live' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'draft',         label: 'Drafts' },
  { key: 'rejected',      label: 'Rejected' },
]

const STATUS_DISPLAY: Record<ProductStatus, { label: string; color: string }> = {
  draft:          { label: 'Draft',          color: 'bg-sand-100 text-sand-600 border-sand-200' },
  pending_review: { label: 'Pending Review', color: 'bg-gold-50 text-gold-700 border-gold-100' },
  approved:       { label: 'Live',           color: 'bg-green-50 text-green-700 border-green-100' },
  rejected:       { label: 'Rejected',       color: 'bg-red-50 text-red-700 border-red-100' },
  paused:         { label: 'Paused',         color: 'bg-sand-100 text-sand-600 border-sand-200' },
  sold_out:       { label: 'Sold Out',       color: 'bg-red-50 text-red-600 border-red-100' },
}

interface Props {
  searchParams: { tab?: string }
}

export default async function VendorListingsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/vendor/listings')
  }

  // Fetch vendor profile
  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('id, status, business_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!vendorProfile) redirect('/vendor/apply')
  if (vendorProfile.status === 'pending') redirect('/vendor/dashboard')
  if (vendorProfile.status === 'rejected') redirect('/vendor/dashboard')

  const activeTab = (searchParams.tab ?? 'all') as TabKey

  // Fetch all products for this vendor
  const { data: allProducts } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorProfile.id)
    .order('created_at', { ascending: false })

  const products = (allProducts ?? []) as Product[]

  const filtered = activeTab === 'all'
    ? products
    : products.filter(p => p.status === activeTab)

  const counts: Record<TabKey, number> = {
    all:           products.length,
    approved:      products.filter(p => p.status === 'approved').length,
    pending_review: products.filter(p => p.status === 'pending_review').length,
    draft:         products.filter(p => p.status === 'draft').length,
    rejected:      products.filter(p => p.status === 'rejected').length,
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
            const isActive = item.href === '/vendor/listings'
            const isAdd = item.href === '/vendor/listings/new'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isAdd    && 'bg-green-600 text-white hover:bg-green-700 mt-1',
                  isActive && !isAdd && 'bg-green-50 text-green-700',
                  !isActive && !isAdd && 'text-sand-700 hover:bg-sand-100 hover:text-sand-900',
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-sand-900">My Listings</h1>
              <p className="text-sand-500 text-sm mt-1">Manage your products and inventory.</p>
            </div>
            <Link
              href="/vendor/listings/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => {
              const count  = counts[tab.key]
              const active = activeTab === tab.key
              return (
                <Link
                  key={tab.key}
                  href={`/vendor/listings?tab=${tab.key}`}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all',
                    active
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-sand-600 border-sand-200 hover:border-green-200 hover:text-green-700'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'text-xs rounded-full px-1.5 py-0.5 font-semibold',
                    active ? 'bg-white/20 text-white' : 'bg-sand-100 text-sand-600'
                  )}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Products grid */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-sand-200 shadow-card">
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mb-4">
                  <PackageOpen className="w-8 h-8 text-sand-400" />
                </div>
                <h3 className="text-base font-semibold text-sand-700 mb-1">
                  {activeTab === 'all' ? 'No listings yet' : `No ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()} listings`}
                </h3>
                <p className="text-sm text-sand-400 mb-6 max-w-xs">
                  {activeTab === 'all'
                    ? 'Create your first product listing and start selling on SWK Marketplace.'
                    : `You don't have any listings with this status.`}
                </p>
                <Link
                  href="/vendor/listings/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Create First Listing
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(product => {
                const statusInfo = STATUS_DISPLAY[product.status] ?? STATUS_DISPLAY.draft
                const primaryImage = product.images?.[0] ?? '/images/product-placeholder.svg'

                return (
                  <div key={product.id} className="product-card group flex flex-col">
                    {/* Image */}
                    <div className="relative h-44 bg-sand-100 overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg' }}
                      />
                      {/* Status badge */}
                      <div className="absolute top-3 left-3">
                        <span className={cn('status-badge border text-xs', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {/* Quick actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/vendor/listings/${product.id}/edit`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 text-sand-700 text-xs font-medium rounded-lg shadow-card hover:bg-white transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Link>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-semibold text-sand-900 line-clamp-2 mb-1">
                        {product.title}
                      </h3>
                      <p className="text-base font-bold text-sand-900 mb-2">
                        {formatCurrency(product.price_ghs)}
                      </p>

                      {/* Rejection reason */}
                      {product.status === 'rejected' && product.rejection_reason && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mb-2">
                          <strong>Rejected: </strong>{product.rejection_reason}
                        </p>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-sand-100 text-xs text-sand-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {product.views ?? 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" /> {product.order_count ?? 0} orders
                        </span>
                        <span className="ml-auto">
                          Stock: {product.stock_quantity}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/vendor/listings/${product.id}/edit`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-sand-200 text-sand-700 text-xs font-medium rounded-lg hover:bg-sand-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Link>
                        {product.status === 'approved' && (
                          <Link
                            href={`/marketplace/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-sand-200 text-sand-700 text-xs font-medium rounded-lg hover:bg-sand-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
