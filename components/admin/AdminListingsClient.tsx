'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import {
  Package,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils'
import { CATEGORY_META, type Product, type ProductStatus } from '@/types'

type ProductWithVendor = Product & { vendor: { business_name: string } | null }
type TabValue = ProductStatus | 'all'

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft:          'bg-sand-100 text-sand-600',
  pending_review: 'bg-gold-50 text-gold-700',
  approved:       'bg-green-50 text-green-700',
  rejected:       'bg-red-50 text-red-700',
  paused:         'bg-sand-100 text-sand-600',
  sold_out:       'bg-blue-50 text-blue-700',
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft:          'Draft',
  pending_review: 'Pending Review',
  approved:       'Approved',
  rejected:       'Rejected',
  paused:         'Paused',
  sold_out:       'Sold Out',
}

interface AdminListingsClientProps {
  initialProducts: ProductWithVendor[]
}

export function AdminListingsClient({ initialProducts }: AdminListingsClientProps) {
  const [products, setProducts]       = useState<ProductWithVendor[]>(initialProducts)
  const [loading, setLoading]         = useState(false)
  const [activeTab, setActiveTab]     = useState<TabValue>('pending_review')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select('*, vendor:vendor_profiles(business_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts((data ?? []) as ProductWithVendor[])
    } catch {
      toast.error('Failed to refresh listings')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleApprove = async (productId: string, title: string) => {
    setActionLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Approval failed')
      }
      toast.success(`"${title}" is now live on the marketplace`)
      await fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleReject = async (productId: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Rejection failed')
      }
      toast.success('Listing rejected. Vendor has been notified.')
      setRejectingId(null)
      setRejectReason('')
      await fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed')
    } finally {
      setActionLoading(prev => ({ ...prev, [productId]: false }))
    }
  }

  const counts: Record<TabValue, number> = {
    all:            products.length,
    pending_review: products.filter(p => p.status === 'pending_review').length,
    approved:       products.filter(p => p.status === 'approved').length,
    rejected:       products.filter(p => p.status === 'rejected').length,
    draft:          products.filter(p => p.status === 'draft').length,
    paused:         products.filter(p => p.status === 'paused').length,
    sold_out:       products.filter(p => p.status === 'sold_out').length,
  }

  const filtered = activeTab === 'all' ? products : products.filter(p => p.status === activeTab)

  const tabs: { label: string; value: TabValue }[] = [
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved',       value: 'approved' },
    { label: 'Rejected',       value: 'rejected' },
    { label: 'All',            value: 'all' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-green-600 text-white'
                  : 'bg-sand-100 text-sand-600 hover:bg-sand-200',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full',
                  activeTab === tab.value
                    ? 'bg-white/25 text-white'
                    : 'bg-sand-200 text-sand-600',
                )}
              >
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={fetchProducts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-sand-400">
          <Package className="w-10 h-10 mb-3" />
          <p className="text-base font-medium">No listings found</p>
          <p className="text-sm mt-1">
            {activeTab === 'pending_review'
              ? 'All listings have been reviewed'
              : `No ${activeTab.replace('_', ' ')} listings`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Listing</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden md:table-cell">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-sand-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filtered.map(product => {
                  const catMeta = CATEGORY_META[product.category]
                  const isRejecting = rejectingId === product.id

                  return (
                    <>
                      <tr key={product.id} className="hover:bg-sand-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-sand-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0 text-lg">
                                {catMeta?.emoji}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-sand-900 truncate max-w-xs">{product.title}</div>
                              <div className="text-xs text-sand-400 truncate max-w-xs">{product.short_description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sand-600 hidden md:table-cell">
                          {product.vendor?.business_name ?? '-'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs text-sand-600">
                            {catMeta?.emoji} {catMeta?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-sand-900">
                          {formatCurrency(product.price_ghs)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[product.status])}>
                            {STATUS_LABELS[product.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-sand-400 hidden md:table-cell">
                          {formatRelativeTime(product.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/marketplace/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-sand-400 hover:text-sand-700 transition-colors"
                              title="View listing"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {product.status === 'pending_review' && (
                              <>
                                <button
                                  onClick={() => handleApprove(product.id, product.title)}
                                  disabled={actionLoading[product.id]}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(product.id)
                                    setRejectReason('')
                                  }}
                                  disabled={actionLoading[product.id]}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isRejecting && (
                        <tr key={`${product.id}-reject`}>
                          <td colSpan={7} className="px-4 pb-4 bg-red-50 border-b border-red-200">
                            <div className="pt-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                                <AlertCircle className="w-4 h-4" />
                                Rejection reason for &quot;{product.title}&quot;
                              </div>
                              <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Explain why this listing doesn't meet SDG 12 requirements..."
                                className="w-full px-3 py-2.5 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReject(product.id)}
                                  disabled={!rejectReason.trim() || actionLoading[product.id]}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                  {actionLoading[product.id] ? 'Rejecting…' : 'Confirm Rejection'}
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectReason('') }}
                                  className="px-4 py-2 text-sm font-medium text-sand-600 hover:text-sand-900 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
