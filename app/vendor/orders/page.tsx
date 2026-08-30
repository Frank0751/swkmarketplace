'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  PackageCheck,
  Truck,
  Loader2,
  MapPin,
  ArrowLeft,
  ShieldCheck,
  PackageOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import {
  formatCurrency,
  formatRelativeTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  cn,
} from '@/lib/utils'
import type { Order, OrderStatus, VendorProfile } from '@/types'

type TabValue = 'all' | 'action' | 'in_progress' | 'completed' | 'other'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Needs action' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'other', label: 'Other' },
]

function tabOf(status: OrderStatus): TabValue {
  if (status === 'paid') return 'action'
  if (status === 'confirmed' || status === 'dispatched') return 'in_progress'
  if (status === 'delivered' || status === 'released') return 'completed'
  return 'other'
}

export default function VendorOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabValue>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=/vendor/orders')
      return
    }

    const { data: vendor } = await supabase
      .from('vendor_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!vendor) {
      router.push('/vendor/apply')
      return
    }

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(id, title, slug, images, price_ghs),
        buyer:users(id, full_name)
      `)
      .eq('vendor_id', (vendor as VendorProfile).id)
      .order('created_at', { ascending: false })

    setOrders((data ?? []) as unknown as Order[])
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function updateStatus(order: Order, status: OrderStatus, confirmText: string) {
    if (!window.confirm(confirmText)) return
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      toast.success(
        status === 'confirmed'
          ? 'Order confirmed. The buyer has been notified.'
          : 'Marked as dispatched. The buyer has been notified.',
      )
      await fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the order')
    } finally {
      setUpdating(null)
    }
  }

  const visible = tab === 'all' ? orders : orders.filter(o => tabOf(o.status) === tab)
  const actionCount = orders.filter(o => o.status === 'paid').length

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <main className="container-app py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/vendor/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-display font-bold text-sand-900">Orders</h1>
          <p className="text-sm text-sand-500 mt-1">
            Confirm new orders, dispatch them, and track their progress. Payouts release after
            the buyer confirms delivery.
          </p>
        </div>

        {/* Escrow reminder */}
        <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700 mb-6">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Buyer payments are held in escrow by SWK Ghana. Confirm each order within 24 hours,
            dispatch it, and your payout (after the 15% platform fee) is released once the buyer
            confirms delivery.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                tab === t.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-sand-200 text-sand-600 hover:border-green-300 hover:text-green-700',
              )}
            >
              {t.label}
              {t.value === 'action' && actionCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gold-400 text-white text-[10px] font-bold">
                  {actionCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-sand-200 p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-3">
              <PackageOpen className="w-7 h-7 text-sand-400" />
            </div>
            <p className="text-sm font-semibold text-sand-700 mb-1">
              {tab === 'all' ? 'No orders yet' : 'Nothing here right now'}
            </p>
            <p className="text-xs text-sand-400 max-w-xs mx-auto">
              {tab === 'all'
                ? 'Orders appear here as soon as buyers purchase your products.'
                : 'Orders will move into this tab as their status changes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(order => {
              const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'bg-sand-100 text-sand-600'
              const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status
              const busy = updating === order.id

              return (
                <div key={order.id} className="bg-white rounded-xl border border-sand-200 shadow-card p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    {/* Product image */}
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-sand-100 border border-sand-200">
                      {order.product?.images?.[0] ? (
                        <Image
                          src={order.product.images[0]}
                          alt={order.product?.title ?? 'Product'}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-sand-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-bold text-sand-900 line-clamp-1">
                          {order.product?.title ?? 'Product'}
                        </p>
                        <span className={cn('status-badge text-[11px]', statusColor)}>{statusLabel}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-sand-400">
                        <span className="font-mono">{order.reference}</span>
                        <span>Qty {order.quantity}</span>
                        <span>{order.buyer?.full_name ?? 'Buyer'}</span>
                        <span>{formatRelativeTime(order.created_at)}</span>
                      </div>
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-sand-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-sand-400" />
                        <span className="line-clamp-2">
                          {order.delivery_address}, {order.delivery_region}
                        </span>
                      </div>
                      {order.buyer_notes && (
                        <p className="mt-2 text-xs text-sand-500 bg-sand-50 border border-sand-100 rounded-lg px-3 py-2">
                          Buyer note: {order.buyer_notes}
                        </p>
                      )}
                    </div>

                    {/* Amount + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-sm font-bold text-sand-900">{formatCurrency(order.total_amount)}</p>

                      {order.status === 'paid' && (
                        <button
                          onClick={() =>
                            updateStatus(
                              order,
                              'confirmed',
                              `Confirm order ${order.reference}? This tells the buyer you have the item and are preparing it.`,
                            )
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                          Confirm order
                        </button>
                      )}

                      {order.status === 'confirmed' && (
                        <button
                          onClick={() =>
                            updateStatus(
                              order,
                              'dispatched',
                              `Mark ${order.reference} as dispatched? The buyer will be asked to confirm delivery when it arrives.`,
                            )
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                          Mark as dispatched
                        </button>
                      )}

                      {order.status === 'dispatched' && (
                        <p className="text-[11px] text-sand-400 text-right max-w-[150px]">
                          Waiting for the buyer to confirm delivery
                        </p>
                      )}

                      {order.status === 'disputed' && (
                        <a
                          href="mailto:info@swkghana.org"
                          className="text-[11px] text-red-500 font-semibold hover:underline"
                        >
                          Contact SWK Ghana
                        </a>
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
  )
}
