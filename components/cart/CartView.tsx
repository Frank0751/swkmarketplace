'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, ShieldCheck, ShoppingBag, Store, Truck, Info, Lock } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { useCartSync } from '@/lib/cart/useCartSync'
import { summarizeCart } from '@/lib/cart/summary'
import { CartLine } from '@/components/cart/CartLine'
import { CartNotices } from '@/components/cart/CartNotices'
import { PaymentBadges } from '@/components/cart/PaymentBadges'
import { formatCurrency } from '@/lib/utils'

export function CartView() {
  const { items, ready, removeItems } = useCart()
  const { notices, dismissNotices, syncing } = useCartSync()
  const summary = summarizeCart(items)
  const unavailable = items.filter(i => i.unavailable)
  const sampleIds = items.filter(i => i.is_demo).map(i => i.product_id)
  const canCheckout = summary.lines.length > 0 && summary.kind !== 'mixed'

  if (!ready) {
    return (
      <div className="grid lg:grid-cols-3 gap-8" role="status" aria-label="Loading your cart">
        <div className="lg:col-span-2 space-y-4">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-sand-200 shadow-card px-6 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-10 h-10 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-display font-bold text-sand-900">Your cart is empty</h2>
        <p className="text-sm text-sand-600 mt-2 mb-7 max-w-sm mx-auto">
          Every product here is checked for sustainability before it goes live. Find something you’ll love.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
        >
          Start shopping <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
      <div className="lg:col-span-2 space-y-4">
        <CartNotices notices={notices} onDismiss={dismissNotices} />

        {summary.kind === 'mixed' && (
          <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <Info className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <p className="flex-1">
              Your cart has sample products and real products. Samples are paid with a test payment, so
              they’re checked out separately.
            </p>
            <button
              type="button"
              onClick={() => removeItems(sampleIds)}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-white border border-red-200 text-sm font-semibold text-red-800 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              Remove sample items
            </button>
          </div>
        )}

        {summary.shops.map(shop => (
          <section
            key={shop.vendor_id}
            aria-labelledby={`shop-${shop.vendor_id}`}
            className="bg-white rounded-2xl border border-sand-200 shadow-card"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-sand-100">
              <h2 id={`shop-${shop.vendor_id}`} className="flex items-center gap-2 text-sm font-bold text-sand-900">
                <Store className="w-4 h-4 text-green-600" aria-hidden="true" />
                {shop.vendor_slug ? (
                  <Link href={`/store/${shop.vendor_slug}`} className="hover:text-green-700 transition-colors">
                    {shop.vendor_name}
                  </Link>
                ) : shop.vendor_name}
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-sand-600">
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                Delivery {formatCurrency(shop.delivery_fee)}
              </p>
            </header>
            <ul className="px-5 divide-y divide-sand-100">
              {shop.lines.map(line => {
                const item = items.find(i => i.product_id === line.product_id)
                return item ? <CartLine key={item.product_id} item={item} showVendor={false} /> : null
              })}
            </ul>
          </section>
        ))}

        {unavailable.length > 0 && (
          <section aria-labelledby="unavailable-heading" className="bg-white rounded-2xl border border-sand-200 shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-sand-100">
              <h2 id="unavailable-heading" className="text-sm font-bold text-sand-900">No longer available</h2>
              <button
                type="button"
                onClick={() => removeItems(unavailable.map(i => i.product_id))}
                className="inline-flex items-center min-h-[36px] text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Remove all
              </button>
            </header>
            <ul className="px-5 divide-y divide-sand-100">
              {unavailable.map(item => <CartLine key={item.product_id} item={item} />)}
            </ul>
          </section>
        )}

        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Continue shopping
        </Link>
      </div>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 bg-white rounded-2xl border border-sand-200 shadow-card p-5 space-y-4">
        <h2 id="summary-heading" className="text-base font-display font-bold text-sand-900">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-sand-700">
            <dt>Items ({summary.item_count})</dt>
            <dd className="font-medium text-sand-900 tabular-nums">{formatCurrency(summary.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-sand-700">
            <dt>
              Delivery
              <span className="block text-xs text-sand-600">
                {formatCurrency(summary.shops[0]?.delivery_fee ?? 0)} per shop
                {summary.shops.length > 1 ? ` × ${summary.shops.length} shops` : ''}
              </span>
            </dt>
            <dd className="font-medium text-sand-900 tabular-nums">{formatCurrency(summary.delivery_total)}</dd>
          </div>
          <div className="flex justify-between pt-3 border-t border-sand-200 text-lg font-bold text-sand-900">
            <dt>Total</dt>
            <dd className="text-green-700 tabular-nums">{formatCurrency(summary.total)}</dd>
          </div>
        </dl>

        {canCheckout ? (
          <Link
            href="/checkout"
            aria-disabled={syncing || undefined}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-green-600 text-white text-base font-semibold hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            Proceed to checkout
          </Link>
        ) : (
          <p className="text-sm text-sand-600">
            {summary.lines.length === 0
              ? 'Nothing in your cart can be bought right now.'
              : 'Sort the items above to continue.'}
          </p>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-teal-50 border border-teal-100 px-3 py-2.5 text-xs text-teal-800">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
          <span>
            Your payment is held by SWK Ghana and released to each shop only after you confirm delivery.
          </span>
        </div>

        {summary.kind === 'sample' && (
          <div className="flex items-start gap-2 rounded-xl bg-gold-50 border border-gold-100 px-3 py-2.5 text-xs text-gold-900">
            <Info className="w-4 h-4 flex-shrink-0 mt-px text-gold-600" aria-hidden="true" />
            <span>
              These are sample products. You’ll pay with a test card or mobile money, so no real money is
              taken, but every other step works exactly as it will for real orders.
            </span>
          </div>
        )}

        <div>
          <p className="text-xs text-sand-600 mb-1.5">Pay by card or mobile money</p>
          <PaymentBadges />
        </div>
      </aside>
    </div>
  )
}
