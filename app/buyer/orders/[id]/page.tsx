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
  CreditCard,
  Flag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { OrderTimeline } from '@/components/buyer/OrderTimeline'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  cn,
  getProductImageUrl,
} from '@/lib/utils'
import { formatGhanaPhone } from '@/lib/marketplace/phone'
import { CONFIRMATION_WINDOW_DAYS, DISPUTABLE_STATUSES } from '@/lib/marketplace/orders'
import type { Order } from '@/types'

async function patchOrder(orderId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/orders/${orderId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong. Please try again.')
  return json
}

export default function BuyerOrderDetailPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const searchParams = useSearchParams()
  const orderId = params.id

  const [order,        setOrder]        = useState<Order | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [confirming,   setConfirming]   = useState(false)
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [notFound,     setNotFound]     = useState(false)
  const [paying,       setPaying]       = useState(false)
  const [cancelOpen,   setCancelOpen]   = useState(false)
  const [disputeOpen,  setDisputeOpen]  = useState(false)
  const [disputeText,  setDisputeText]  = useState('')
  const [disputeError, setDisputeError] = useState('')
  const [disputing,    setDisputing]    = useState(false)

  useEffect(() => {
    fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } else if (json.outcome === 'amount_mismatch') {
          toast.error('Your payment didn’t match this order. SWK Ghana has been alerted and will contact you.')
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
      await patchOrder(order.id, { status: 'delivered' })
      toast.success('Delivery confirmed! Thank you for shopping sustainably.')
      await fetchOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  async function handlePayNow() {
    if (!order) return
    setPaying(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not open the payment page.')
      if (json.status === 'paid') {
        toast.success('Good news: this order is already paid.')
        await fetchOrder()
        setPaying(false)
        return
      }
      window.location.href = json.payment_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the payment page.')
      setPaying(false)
    }
  }

  async function handleCancel() {
    if (!order) return
    try {
      await patchOrder(order.id, { status: 'cancelled' })
      toast.success('Order cancelled')
      await fetchOrder()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the order.')
    }
  }

  async function submitDispute(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    const note = disputeText.trim()
    if (note.length < 10) {
      setDisputeError('Please describe the problem in a sentence or two.')
      return
    }
    setDisputeError('')
    setDisputing(true)
    try {
      await patchOrder(order.id, { status: 'disputed', note })
      setDisputeOpen(false)
      setDisputeText('')
      toast.success('Problem reported. We’ll contact you within 2 working days.')
      await fetchOrder()
    } catch (err) {
      setDisputeError(err instanceof Error ? err.message : 'Could not send your report. Please try again.')
    } finally {
      setDisputing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div role="status" className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading your order…</span>
        </div>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <main id="main" className="container-app py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-sand-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-display font-bold text-sand-900 mb-2">Order not found</h1>
          <p className="text-sand-600 text-sm mb-6">
            This order doesn&rsquo;t exist or you don&rsquo;t have permission to view it.
          </p>
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Orders
          </Link>
        </main>
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
  const canReport = DISPUTABLE_STATUSES.includes(order.status)

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <main id="main" className="container-app py-6 md:py-8">
        {/* Back button + header */}
        <div className="mb-6">
          <Link
            href="/buyer/orders"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-sand-600 hover:text-sand-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Orders
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl font-display font-bold text-sand-900">
                  Order {order.reference}
                </h1>
                <span className={cn('status-badge', order.status, statusColor)}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-sand-600">Placed on {formatDate(order.created_at)}</p>
            </div>

            {/* Confirm delivery CTA. The consequence is stated here too, not
                only in the mobile block, so desktop buyers see it before they
                release the escrow. */}
            {order.status === 'dispatched' && (
              <div className="sm:text-right">
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  {confirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  )}
                  {confirming ? 'Confirming…' : 'Confirm delivery'}
                </button>
                <p className="mt-1.5 text-xs text-sand-600 max-w-xs sm:ml-auto">
                  This releases your payment to the vendor and cannot be undone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left column (timeline + details) ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Unpaid: a buyer who closed the payment page, or whose mobile
                money prompt timed out, previously had no way to pay */}
            {order.status === 'pending' && (
              <div className="p-5 bg-white border-2 border-gold-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5 text-gold-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sand-900">Payment not completed</p>
                    <p className="text-xs text-sand-600 mt-0.5 leading-relaxed">
                      The vendor only starts on your order once it&rsquo;s paid. If you closed the
                      payment page or your mobile money prompt timed out, you can pay now.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={handlePayNow}
                        disabled={paying}
                        className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                      >
                        {paying && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {paying ? 'Opening payment…' : `Pay ${formatCurrency(order.total_amount)}`}
                      </button>
                      <button
                        onClick={() => setCancelOpen(true)}
                        disabled={paying}
                        className="inline-flex items-center min-h-[44px] px-4 rounded-xl border-2 border-sand-200 bg-white text-sm font-medium text-sand-700 hover:bg-sand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                      >
                        Cancel order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Escrow reassurance, shown for the whole time the money is held. */}
            {['paid', 'confirmed', 'dispatched'].includes(order.status) && (
              <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Your money is held safely</p>
                  <p className="text-xs mt-0.5 opacity-90">
                    {order.status === 'paid' &&
                      'SWK Ghana is holding your payment. The vendor is preparing your order and does not have the money yet.'}
                    {order.status === 'confirmed' &&
                      'The vendor has accepted your order and will call you to arrange delivery. SWK Ghana still holds your payment.'}
                    {order.status === 'dispatched' &&
                      `Your order is on its way. SWK Ghana releases your payment only when you confirm delivery. Please confirm, or report a problem, within ${CONFIRMATION_WINDOW_DAYS} days of dispatch.`}
                  </p>
                </div>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Delivery confirmed</p>
                  <p className="text-xs mt-0.5 opacity-90">
                    Thank you! SWK Ghana is now processing the payout to the vendor.
                  </p>
                </div>
              </div>
            )}

            {/* Review prompt after delivery */}
            {(order.status === 'delivered' || order.status === 'released') && order.product?.slug && (
              <div className="flex items-center justify-between gap-3 p-4 bg-white border border-gold-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-gold-400 fill-gold-400 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-sand-900">How was your order?</p>
                    <p className="text-xs text-sand-600 mt-0.5">
                      Your review helps other buyers shop with confidence.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/marketplace/${order.product.slug}#reviews`}
                  className="flex-shrink-0 inline-flex items-center min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
                >
                  Leave a review →
                </Link>
              </div>
            )}

            {order.status === 'disputed' && (
              <div className="flex items-start gap-3 p-4 bg-gold-50 border border-gold-100 rounded-xl text-gold-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Problem reported</p>
                  <p className="text-xs mt-0.5">
                    Your payment is on hold while SWK Ghana looks into it. We&rsquo;ll contact you within
                    2 working days. You can also reach us at{' '}
                    <a href="mailto:info@swkghana.org" className="underline">info@swkghana.org</a>.
                  </p>
                </div>
              </div>
            )}

            {order.status === 'refunded' && (
              <div className="flex items-start gap-3 p-4 bg-sand-100 border border-sand-200 rounded-xl text-sand-800">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Refunded</p>
                  <p className="text-xs mt-0.5">
                    This order was refunded to the account you paid with. Refunds usually arrive within
                    3–10 working days.
                  </p>
                </div>
              </div>
            )}

            {/* The escalation path the Terms promise: puts the order on hold
                and alerts SWK Ghana, the vendor and the buyer */}
            {canReport && (
              <div className="flex items-start gap-3 p-4 bg-sand-100 border border-sand-200 rounded-xl">
                <Flag className="w-5 h-5 flex-shrink-0 mt-0.5 text-sand-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sand-900">Problem with this order?</p>
                  <p className="text-xs text-sand-600 mt-0.5 leading-relaxed">
                    Your payment is still held in escrow and has not gone to the vendor. If your order
                    is late, damaged, or not what you expected, tell us before confirming delivery.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDisputeOpen(true)}
                    className="inline-flex items-center min-h-[44px] mt-2 text-sm font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                  >
                    Report a problem
                  </button>
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
                  <dt className="text-sand-600 text-xs mb-0.5">Order reference</dt>
                  <dd className="font-mono font-medium text-sand-900">{order.reference}</dd>
                </div>
                <div>
                  <dt className="text-sand-600 text-xs mb-0.5">Order date</dt>
                  <dd className="font-medium text-sand-900">{formatDate(order.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sand-600 text-xs mb-0.5">Quantity</dt>
                  <dd className="font-medium text-sand-900">{order.quantity}</dd>
                </div>
                {order.estimated_delivery && (
                  <div>
                    <dt className="text-sand-600 text-xs mb-0.5">Estimated delivery</dt>
                    <dd className="font-medium text-sand-900">{order.estimated_delivery}</dd>
                  </div>
                )}
                {order.paystack_reference && (
                  <div className="col-span-2">
                    <dt className="text-sand-600 text-xs mb-0.5">Payment reference</dt>
                    <dd className="font-mono text-xs text-sand-600 break-all">{order.paystack_reference}</dd>
                  </div>
                )}
                {order.dispatched_at && (
                  <div>
                    <dt className="text-sand-600 text-xs mb-0.5">Dispatched at</dt>
                    <dd className="font-medium text-sand-900">{formatDateTime(order.dispatched_at)}</dd>
                  </div>
                )}
                {order.delivered_at && (
                  <div>
                    <dt className="text-sand-600 text-xs mb-0.5">Delivered at</dt>
                    <dd className="font-medium text-sand-900">{formatDateTime(order.delivered_at)}</dd>
                  </div>
                )}
              </dl>

              {order.buyer_notes && (
                <div className="mt-4 pt-4 border-t border-sand-100">
                  <p className="text-sand-600 text-xs mb-1">Your notes</p>
                  <p className="text-sm text-sand-700">{order.buyer_notes}</p>
                </div>
              )}

              {order.vendor_notes && (
                <div className="mt-3">
                  <p className="text-sand-600 text-xs mb-1">Vendor notes</p>
                  <p className="text-sm text-sand-700">{order.vendor_notes}</p>
                </div>
              )}
            </div>

            {/* Delivery details */}
            <div className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-sand-600" aria-hidden="true" />
                <h2 className="text-base font-display font-semibold text-sand-900">Delivery Details</h2>
              </div>
              <p className="text-sm text-sand-700">{order.delivery_address}</p>
              <p className="text-sm text-sand-600 mt-1">{order.delivery_region}, Ghana</p>
              {order.delivery_phone && (
                <p className="text-sm text-sand-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatGhanaPhone(order.delivery_phone)}
                  <span className="text-xs">(the vendor calls this number)</span>
                </p>
              )}
            </div>
          </div>

          {/* ── Right column (summary + vendor) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order summary card */}
            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-4">Order Summary</h2>

              {product && (
                <Link
                  href={`/marketplace/${product.slug}`}
                  className="flex gap-3 mb-4 group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-sand-100 border border-sand-200">
                    <img
                      src={primaryImage}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sand-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                      {product.title}
                    </p>
                    <p className="text-xs text-sand-600 mt-0.5">
                      {formatCurrency(order.unit_price)} × {order.quantity}
                    </p>
                  </div>
                </Link>
              )}

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
                  <ShieldCheck className="w-4 h-4 text-teal-600" aria-hidden="true" />
                  <h2 className="text-base font-display font-semibold text-sand-900">Escrow Status</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-sand-600">Status</span>
                    <span className={cn(
                      'font-medium',
                      payout.status === 'held'            && 'text-gold-700',
                      payout.status === 'pending_release' && 'text-teal-700',
                      payout.status === 'released'        && 'text-green-700',
                      payout.status === 'failed'          && 'text-red-700',
                      payout.status === 'cancelled'       && 'text-sand-700',
                    )}>
                      {payout.status === 'held'            && 'Funds held in escrow'}
                      {payout.status === 'pending_release' && 'Payout releasing'}
                      {payout.status === 'released'        && 'Released to vendor'}
                      {payout.status === 'failed'          && 'Release failed'}
                      {payout.status === 'cancelled'       && 'Refunded to you'}
                    </span>
                  </div>
                  {payout.released_at && (
                    <div className="flex justify-between">
                      <span className="text-sand-600">Released</span>
                      <span className="font-medium text-sand-900">{formatDate(payout.released_at)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-sand-600 mt-3">
                  SWK Ghana holds your payment until you confirm delivery, protecting every transaction.
                </p>
              </div>
            )}

            {/* Vendor info */}
            {vendor && (
              <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-sand-600" aria-hidden="true" />
                  <h2 className="text-base font-display font-semibold text-sand-900">Sold By</h2>
                </div>
                <div className="flex items-center gap-3">
                  {vendor.logo_url ? (
                    <img
                      src={vendor.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-sand-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <span className="text-green-700 font-bold text-base">
                        {vendor.business_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sand-900">{vendor.business_name}</p>
                    {vendor.location && (
                      <p className="text-xs text-sand-600 mt-0.5">
                        {vendor.location}, {vendor.region}
                      </p>
                    )}
                    {vendor.phone && order.status !== 'pending' && (
                      <a
                        href={`tel:${vendor.phone}`}
                        className="inline-flex items-center gap-1 min-h-[32px] text-xs text-green-700 hover:text-green-800 transition-colors"
                      >
                        <Phone className="w-3 h-3" aria-hidden="true" /> {formatGhanaPhone(vendor.phone)}
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
                <p className="text-xs text-green-800 mb-3">
                  Confirming delivery releases the escrow payment to the vendor.
                </p>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                  {confirming ? 'Confirming…' : 'Confirm delivery'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelivery}
        title="Confirm you received this order?"
        description="SWK Ghana will release your payment from escrow to the vendor."
        details={[
          { label: 'Order',  value: order.reference },
          { label: 'Vendor', value: vendor?.business_name ?? 'Vendor' },
          { label: 'Amount released', value: formatCurrency(order.total_amount), emphasis: true },
        ]}
        warning="Only confirm once the goods are in your hands. This cannot be undone, and your escrow protection ends here."
        confirmLabel="Yes, I received it"
        cancelLabel="Not yet"
      />

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel this order?"
        description="It hasn’t been paid, so nothing will be charged."
        details={[
          { label: 'Order',   value: order.reference },
          { label: 'Product', value: product?.title ?? 'Product' },
        ]}
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep order"
        tone="danger"
      />

      <Modal
        open={disputeOpen}
        onClose={() => { if (!disputing) setDisputeOpen(false) }}
        title="Report a problem"
        description="Your payment stays on hold while we look into it. We’ll contact you within 2 working days."
      >
        <form onSubmit={submitDispute} className="space-y-4" noValidate>
          <div>
            <label htmlFor="dispute-note" className="form-label">What went wrong?</label>
            <textarea
              id="dispute-note"
              value={disputeText}
              onChange={e => setDisputeText(e.target.value)}
              rows={5}
              maxLength={1000}
              className="form-input resize-y"
              placeholder="e.g. The order hasn’t arrived and the vendor isn’t answering my calls."
              aria-describedby="dispute-hint"
              aria-invalid={!!disputeError}
            />
            <p id="dispute-hint" className="mt-1 text-xs text-sand-600">
              Include dates and anything you&rsquo;ve already tried. {disputeText.trim().length}/1000
            </p>
            {disputeError && <p role="alert" className="form-error">{disputeError}</p>}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setDisputeOpen(false)}
              disabled={disputing}
              className="min-h-[44px] px-4 rounded-xl border-2 border-sand-200 bg-white text-sm font-medium text-sand-700 hover:bg-sand-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disputing}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              {disputing && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {disputing ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
