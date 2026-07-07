'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Package,
  Store,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Phone,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { OrderTimeline } from '@/components/buyer/OrderTimeline'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  cn,
  getProductImageUrl,
} from '@/lib/utils'
import type { Order } from '@/types'

export default function BuyerOrderDetailPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [order,       setOrder]       = useState<Order | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [confirming,  setConfirming]  = useState(false)
  const [notFound,    setNotFound]    = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  // Returning from Paystack: reconcile payment status immediately in case
  // the webhook hasn't been processed yet
  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return
    fetch('/api/paystack/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order_id: orderId }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.reconciled) {
          toast.success('Payment confirmed, funds held in escrow')
          fetchOrder()
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  async function fetchOrder() {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=/buyer/orders/' + orderId)
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        product:products(id, title, slug, images, price_ghs, short_description),
        vendor:vendor_profiles(id, business_name, logo_url, phone, location, region),
        payout:payouts(id, status, gross_amount, commission_amount, net_amount, released_at)
      `)
      .eq('id', orderId)
      .eq('buyer_id', user.id)
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setOrder(data as unknown as Order)
    }
    setLoading(false)
  }

  async function handleConfirmDelivery() {
    if (!order) return
    setConfirming(true)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'delivered' }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to confirm delivery')
      }

      toast.success('Delivery confirmed! Thank you for shopping sustainably.')
      await fetchOrder()
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="container-app py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-sand-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-sand-900 mb-2">Order not found</h1>
          <p className="text-sand-500 text-sm mb-6">
            This order doesn&rsquo;t exist or you don&rsquo;t have permission to view it.
          </p>
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const product = order.product
  const vendor  = order.vendor
  const payout  = order.payout

  const primaryImage = product?.images?.[0]
    ? getProductImageUrl(product.images, 0)
    : '/images/product-placeholder.svg'

  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'bg-sand-100 text-sand-600'

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="container-app py-6 md:py-8">
        {/* Back button + header */}
        <div className="mb-6">
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-display font-bold text-sand-900">
                  Order {order.reference}
                </h1>
                <span className={cn('status-badge', order.status, statusColor)}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-sand-500">Placed on {formatDate(order.created_at)}</p>
            </div>

            {/* Confirm delivery CTA */}
            {order.status === 'dispatched' && (
              <button
                onClick={handleConfirmDelivery}
                disabled={confirming}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm"
              >
                {confirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {confirming ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left column (timeline + details) ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Status banner */}
            {order.status === 'paid' && (
              <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Funds in escrow</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Your payment is securely held by SWK Ghana. The vendor is preparing your order.
                  </p>
                </div>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Delivery confirmed</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Thank you! SWK Ghana is now processing the payout to the vendor.
                  </p>
                </div>
              </div>
            )}

            {/* Review prompt after delivery */}
            {(order.status === 'delivered' || order.status === 'released') && order.product?.slug && (
              <div className="flex items-center justify-between gap-3 p-4 bg-white border border-gold-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-gold-400 fill-gold-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-sand-900">How was your order?</p>
                    <p className="text-xs text-sand-500 mt-0.5">
                      Your review helps other buyers shop with confidence.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/marketplace/${order.product.slug}#reviews`}
                  className="flex-shrink-0 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
                >
                  Leave a review →
                </Link>
              </div>
            )}

            {order.status === 'disputed' && (
              <div className="flex items-start gap-3 p-4 bg-gold-50 border border-gold-100 rounded-xl text-gold-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Dispute raised</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    SWK Ghana is reviewing this order. We&rsquo;ll contact you within 24–48 hours.
                    You can reach us at{' '}
                    <a href="mailto:info@swkghana.org" className="underline">info@swkghana.org</a>.
                  </p>
                </div>
              </div>
            )}

            {/* Order timeline */}
            <div className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-5">Order Progress</h2>
              <OrderTimeline order={order} />
            </div>

            {/* Order info */}
            <div className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-4">Order Details</h2>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <dt className="text-sand-400 text-xs mb-0.5">Order reference</dt>
                  <dd className="font-mono font-medium text-sand-900">{order.reference}</dd>
                </div>
                <div>
                  <dt className="text-sand-400 text-xs mb-0.5">Order date</dt>
                  <dd className="font-medium text-sand-900">{formatDate(order.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sand-400 text-xs mb-0.5">Quantity</dt>
                  <dd className="font-medium text-sand-900">{order.quantity}</dd>
                </div>
                {order.estimated_delivery && (
                  <div>
                    <dt className="text-sand-400 text-xs mb-0.5">Estimated delivery</dt>
                    <dd className="font-medium text-sand-900">{formatDate(order.estimated_delivery)}</dd>
                  </div>
                )}
                {order.paystack_reference && (
                  <div className="col-span-2">
                    <dt className="text-sand-400 text-xs mb-0.5">Payment reference</dt>
                    <dd className="font-mono text-xs text-sand-600 break-all">{order.paystack_reference}</dd>
                  </div>
                )}
                {order.dispatched_at && (
                  <div>
                    <dt className="text-sand-400 text-xs mb-0.5">Dispatched at</dt>
                    <dd className="font-medium text-sand-900">{formatDateTime(order.dispatched_at)}</dd>
                  </div>
                )}
                {order.delivered_at && (
                  <div>
                    <dt className="text-sand-400 text-xs mb-0.5">Delivered at</dt>
                    <dd className="font-medium text-sand-900">{formatDateTime(order.delivered_at)}</dd>
                  </div>
                )}
              </dl>

              {order.buyer_notes && (
                <div className="mt-4 pt-4 border-t border-sand-100">
                  <dt className="text-sand-400 text-xs mb-1">Your notes</dt>
                  <dd className="text-sm text-sand-700">{order.buyer_notes}</dd>
                </div>
              )}

              {order.vendor_notes && (
                <div className="mt-3">
                  <dt className="text-sand-400 text-xs mb-1">Vendor notes</dt>
                  <dd className="text-sm text-sand-700">{order.vendor_notes}</dd>
                </div>
              )}
            </div>

            {/* Delivery address */}
            <div className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-sand-400" />
                <h2 className="text-base font-display font-semibold text-sand-900">Delivery Address</h2>
              </div>
              <p className="text-sm text-sand-700">{order.delivery_address}</p>
              <p className="text-sm text-sand-500 mt-1">{order.delivery_region}, Ghana</p>
            </div>
          </div>

          {/* ── Right column (summary + vendor) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order summary card */}
            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-4">Order Summary</h2>

              {/* Product */}
              {product && (
                <Link
                  href={`/marketplace/${product.slug}`}
                  className="flex gap-3 mb-4 group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-sand-100 border border-sand-200">
                    <img
                      src={primaryImage}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sand-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                      {product.title}
                    </p>
                    <p className="text-xs text-sand-400 mt-0.5">
                      {formatCurrency(order.unit_price)} × {order.quantity}
                    </p>
                  </div>
                </Link>
              )}

              {/* Price breakdown */}
              <div className="space-y-2 text-sm border-t border-sand-100 pt-3">
                <div className="flex justify-between text-sand-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sand-600">
                  <span>Delivery fee</span>
                  <span>{order.delivery_fee > 0 ? formatCurrency(order.delivery_fee) : 'Free'}</span>
                </div>
                <div className="flex justify-between font-bold text-sand-900 border-t border-sand-100 pt-2 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Escrow status */}
            {payout && (
              <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <h2 className="text-base font-display font-semibold text-sand-900">Escrow Status</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-sand-500">Status</span>
                    <span className={cn(
                      'font-medium capitalize',
                      payout.status === 'held'           && 'text-gold-600',
                      payout.status === 'pending_release' && 'text-teal-600',
                      payout.status === 'released'       && 'text-green-600',
                      payout.status === 'failed'         && 'text-red-600',
                    )}>
                      {payout.status === 'held'            && 'Funds held in escrow'}
                      {payout.status === 'pending_release' && 'Payout releasing'}
                      {payout.status === 'released'        && 'Released to vendor'}
                      {payout.status === 'failed'          && 'Release failed'}
                    </span>
                  </div>
                  {payout.released_at && (
                    <div className="flex justify-between">
                      <span className="text-sand-500">Released</span>
                      <span className="font-medium text-sand-900">{formatDate(payout.released_at)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-sand-400 mt-3">
                  SWK Ghana holds your payment until you confirm delivery, protecting every transaction.
                </p>
              </div>
            )}

            {/* Vendor info */}
            {vendor && (
              <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-sand-400" />
                  <h2 className="text-base font-display font-semibold text-sand-900">Sold By</h2>
                </div>
                <div className="flex items-center gap-3">
                  {vendor.logo_url ? (
                    <img
                      src={vendor.logo_url}
                      alt={vendor.business_name}
                      className="w-12 h-12 rounded-full object-cover border border-sand-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-bold text-base">
                        {vendor.business_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sand-900">{vendor.business_name}</p>
                    {vendor.location && (
                      <p className="text-xs text-sand-400 mt-0.5">
                        {vendor.location}, {vendor.region}
                      </p>
                    )}
                    {vendor.phone && (
                      <a
                        href={`tel:${vendor.phone}`}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-1 transition-colors"
                      >
                        <Phone className="w-3 h-3" /> {vendor.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Confirm delivery box (mobile repeat) */}
            {order.status === 'dispatched' && (
              <div className="lg:hidden bg-green-50 rounded-xl border border-green-100 p-4">
                <p className="text-sm font-semibold text-green-800 mb-1">Have you received your order?</p>
                <p className="text-xs text-green-600 mb-3">
                  Confirming delivery releases the escrow payment to the vendor.
                </p>
                <button
                  onClick={handleConfirmDelivery}
                  disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors"
                >
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {confirming ? 'Confirming…' : 'Confirm Delivery'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
