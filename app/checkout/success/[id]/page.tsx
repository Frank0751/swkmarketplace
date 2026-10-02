import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { paymentsMode } from '@/lib/paystack/client'
import { settleCheckoutPayment } from '@/lib/paystack/confirm'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { formatGhanaPhone } from '@/lib/marketplace/phone'
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Checkout } from '@/types'

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type OrderRow = {
  id: string
  reference: string
  status: string
  quantity: number
  total_amount: number
  product_id: string
  product: { title: string; slug: string; images: string[] | null } | null
  vendor: { business_name: string; slug: string | null } | null
}

const NEXT_STEPS = [
  { icon: Store,       title: 'Each shop confirms your order', body: 'Usually within 24 hours. You’ll get an email.' },
  { icon: Truck,       title: 'The shop calls you and delivers', body: 'They use the phone number you gave to arrange a time.' },
  { icon: CheckCircle2, title: 'You confirm delivery', body: 'From your order page, once everything has arrived as described.' },
  { icon: Wallet,      title: 'SWK Ghana pays the shop', body: 'Only then is your money released to them.' },
]

export default async function CheckoutSuccessPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/checkout/success/${params.id}`)

  const load = async () => {
    const { data } = await supabase.from('checkouts').select('*').eq('id', params.id).maybeSingle()
    return data as Checkout | null
  }

  let checkout = await load()
  if (!checkout) notFound()

  // Back from Paystack before its webhook arrived: settle now, with the same
  // checks (Paystack is asked for the amount; nothing is taken from the URL)
  if (checkout.status === 'pending' && !checkout.is_demo && checkout.paystack_reference && paymentsMode() !== 'off') {
    try {
      const admin = await createAdminClient()
      await settleCheckoutPayment(admin, { reference: checkout.paystack_reference, checkoutId: checkout.id })
      checkout = (await load()) ?? checkout
    } catch (err) {
      console.error('[Checkout success] settle failed:', err)
    }
  }

  if (checkout.status !== 'paid') {
    return (
      <div className="min-h-screen bg-sand-50">
        <CheckoutHeader />
        <main id="main" className="container-app max-w-xl py-16 text-center">
          <CircleAlert className="w-12 h-12 text-gold-600 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-display font-bold text-sand-900">
            {checkout.status === 'cancelled' ? 'This checkout was closed' : 'Payment not completed yet'}
          </h1>
          <p className="text-sm text-sand-600 mt-2 mb-8 leading-relaxed">
            {checkout.status === 'cancelled'
              ? 'Nothing was charged for it. Your cart is still saved, so you can check out again.'
              : 'We haven’t received the payment for this order. If you paid by mobile money, it can take a minute: refresh this page. Otherwise, go back and try again. Nothing has been charged twice.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
              Back to checkout
            </Link>
            <Link href={`/checkout/success/${checkout.id}`} className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-xl border-2 border-sand-200 bg-white text-sm font-semibold text-sand-800 hover:bg-sand-50 transition-colors">
              Refresh
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const [{ data: orderRows }, { data: profile }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, reference, status, quantity, total_amount, product_id, product:products(title, slug, images), vendor:vendor_profiles(business_name, slug)')
      .eq('checkout_id', checkout.id)
      .order('created_at', { ascending: true }),
    supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle(),
  ])
  const orders = (orderRows ?? []) as unknown as OrderRow[]
  const firstName = (profile?.full_name ?? '').split(' ')[0]
  const shopCount = new Set(checkout.items.map(i => i.vendor_id)).size

  return (
    <div className="min-h-screen bg-sand-50">
      <CheckoutHeader />
      <main id="main" className="container-app max-w-3xl py-8 md:py-12 pb-16">
        {/* ── Confirmation ─────────────────────────────────────────── */}
        <section className="text-center">
          <svg viewBox="0 0 52 52" className="w-20 h-20 mx-auto mb-5 animate-pop-in" aria-hidden="true">
            <circle cx="26" cy="26" r="25" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="2" />
            <path
              d="M15 27 l7 7 l15 -16"
              fill="none"
              stroke="#3B6D11"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              className="animate-draw"
            />
          </svg>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-sand-900 text-balance">
            Thank you{firstName ? `, ${firstName}` : ''}! Your order is confirmed.
          </h1>
          <p className="text-sm text-sand-600 mt-2">
            Payment <span className="font-mono font-semibold text-sand-800">{checkout.reference}</span>
            {checkout.payment_label ? <> · Paid with {checkout.payment_label}</> : null}
            {checkout.paid_at ? <> · {formatDateTime(checkout.paid_at)}</> : null}
          </p>
          {profile?.email && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-sand-600">
              <Mail className="w-4 h-4" aria-hidden="true" /> We’ve emailed your receipt to {profile.email}
            </p>
          )}
        </section>

        {checkout.is_demo && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4 text-sm text-gold-900">
            <FlaskConical className="w-5 h-5 flex-shrink-0 text-gold-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">This was a sample order, so no money was taken.</p>
              <p className="mt-0.5 leading-relaxed">
                Everything else is real: the shop’s stock went down, each payment is held in escrow, and you can
                follow every order. Open one to play the shop’s part (confirm, then dispatch), then confirm delivery
                yourself.
              </p>
            </div>
          </div>
        )}

        {/* ── Orders ───────────────────────────────────────────────── */}
        <section aria-labelledby="orders-heading" className="mt-8 bg-white rounded-2xl border border-sand-200 shadow-card">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <h2 id="orders-heading" className="text-base font-display font-bold text-sand-900">
              {orders.length === 1 ? 'Your order' : `Your ${orders.length} orders`}
            </h2>
            <p className="text-xs text-sand-600">
              From {shopCount} {shopCount === 1 ? 'shop' : 'shops'}, each delivered separately
            </p>
          </div>
          <ul className="divide-y divide-sand-100">
            {orders.map(order => {
              const image = order.product?.images?.[0] || '/images/product-placeholder.svg'
              return (
                <li key={order.id}>
                  <Link
                    href={`/buyer/orders/${order.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-sand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                  >
                    <span className="relative w-14 h-14 rounded-lg overflow-hidden bg-sand-100 border border-sand-200 flex-shrink-0">
                      <Image src={image} alt="" fill sizes="56px" className="object-cover" unoptimized={!canOptimizeImage(image)} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-sand-900 truncate">
                        {order.product?.title ?? 'Product'}
                      </span>
                      <span className="block text-xs text-sand-600 truncate">
                        {order.vendor?.business_name} · Qty {order.quantity} ·{' '}
                        <span className="font-mono">{order.reference}</span>
                      </span>
                      <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-medium">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </span>
                    <span className="text-right flex-shrink-0">
                      <span className="block text-sm font-bold text-sand-900 tabular-nums">{formatCurrency(order.total_amount)}</span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700">
                        Track <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <dl className="border-t border-sand-200 px-5 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-sand-700">
              <dt>Subtotal</dt><dd className="tabular-nums text-sand-900">{formatCurrency(checkout.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-sand-700">
              <dt>Delivery ({shopCount} {shopCount === 1 ? 'shop' : 'shops'})</dt>
              <dd className="tabular-nums text-sand-900">{formatCurrency(checkout.delivery_total)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-sand-200 text-base font-bold text-sand-900">
              <dt>Total paid</dt><dd className="tabular-nums text-green-700">{formatCurrency(checkout.total_amount)}</dd>
            </div>
          </dl>
        </section>

        {/* ── Delivery + escrow ────────────────────────────────────── */}
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <section aria-labelledby="delivery-heading" className="bg-white rounded-2xl border border-sand-200 shadow-card p-5">
            <h2 id="delivery-heading" className="text-sm font-bold text-sand-900 mb-3">Delivering to</h2>
            <p className="flex items-start gap-2 text-sm text-sand-700">
              <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" aria-hidden="true" />
              <span>{checkout.delivery_address}, {checkout.delivery_region}</span>
            </p>
            <p className="flex items-center gap-2 text-sm text-sand-700 mt-2">
              <Phone className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
              {formatGhanaPhone(checkout.delivery_phone)}
            </p>
            {checkout.buyer_notes && (
              <p className="mt-2 text-xs text-sand-600 italic">“{checkout.buyer_notes}”</p>
            )}
          </section>
          <section aria-labelledby="escrow-heading" className="bg-teal-50 rounded-2xl border border-teal-100 p-5 text-teal-900">
            <h2 id="escrow-heading" className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Your money is protected
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              SWK Ghana is holding {formatCurrency(checkout.total_amount)}. No shop is paid until you confirm your
              delivery, and if something’s wrong you can report a problem from the order page.
            </p>
          </section>
        </div>

        {/* ── What happens next ────────────────────────────────────── */}
        <section aria-labelledby="next-heading" className="mt-6 bg-white rounded-2xl border border-sand-200 shadow-card p-5">
          <h2 id="next-heading" className="text-sm font-bold text-sand-900 mb-4">What happens next</h2>
          <ol className="grid sm:grid-cols-2 gap-4">
            {NEXT_STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 relative">
                  <Icon className="w-4 h-4 text-green-700" aria-hidden="true" />
                  <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-sand-900">{title}</span>
                  <span className="block text-xs text-sand-600 mt-0.5">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={orders.length === 1 ? `/buyer/orders/${orders[0].id}` : '/buyer/orders'}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
          >
            <Package className="w-4 h-4" aria-hidden="true" />
            {orders.length === 1 ? 'Track my order' : 'Track my orders'}
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-xl border-2 border-sand-200 bg-white text-sm font-semibold text-sand-800 hover:bg-sand-50 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    </div>
  )
}
