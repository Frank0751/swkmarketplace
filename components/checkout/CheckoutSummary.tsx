'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PricedCart } from '@/lib/cart/pricing'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { formatCurrency } from '@/lib/utils'

/** The cart as it will be charged: items by shop, delivery per shop, total */
export function CheckoutSummary({ summary }: { summary: PricedCart }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-4" aria-label="Items in your order">
        {summary.shops.map(shop => (
          <li key={shop.vendor_id}>
            <p className="eyebrow mb-2.5">{shop.vendor_name}</p>
            <ul className="space-y-2.5">
              {shop.lines.map(line => {
                const image = line.image || '/images/product-placeholder.svg'
                return (
                  <li key={line.product_id} className="flex items-center gap-3">
                    <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-sand-100 border border-sand-200 flex-shrink-0">
                      <Image src={image} alt="" fill sizes="48px" className="object-cover" unoptimized={!canOptimizeImage(image)} />
                      <span className="absolute -top-0 -right-0 min-w-[18px] h-[18px] px-1 rounded-bl-lg bg-sand-900/80 text-white text-[10px] font-bold leading-[18px] text-center">
                        {line.quantity}
                      </span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-sand-900 truncate">{line.title}</span>
                      <span className="block text-xs text-sand-600">
                        {line.quantity} × {formatCurrency(line.unit_price)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-sand-900 tabular-nums">{formatCurrency(line.subtotal)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 flex justify-between text-xs text-sand-600">
              <span>Delivery from {shop.vendor_name}</span>
              <span className="tabular-nums">{formatCurrency(shop.delivery_fee)}</span>
            </p>
          </li>
        ))}
      </ul>

      <dl className="space-y-1.5 border-t border-sand-200 pt-3 text-sm">
        <div className="flex justify-between text-sand-700">
          <dt>Subtotal</dt>
          <dd className="tabular-nums text-sand-900">{formatCurrency(summary.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-sand-700">
          <dt>Delivery</dt>
          <dd className="tabular-nums text-sand-900">{formatCurrency(summary.delivery_total)}</dd>
        </div>
        <div className="flex justify-between border-t border-sand-200 pt-2 text-lg font-bold text-sand-900">
          <dt>Total</dt>
          <dd className="tabular-nums text-green-700">{formatCurrency(summary.total)}</dd>
        </div>
      </dl>

      <p className="rounded-xl bg-teal-50 border border-teal-100 px-3.5 py-3 text-xs leading-relaxed text-teal-800">
        <strong className="font-semibold">Escrow protected.</strong> SWK Ghana holds your payment and pays each
        shop only after you confirm your delivery.
      </p>

      {summary.kind === 'sample' && (
        <p className="rounded-xl bg-gold-50 border border-gold-100 px-3.5 py-3 text-xs leading-relaxed text-gold-900">
          <strong className="font-semibold">Sample products.</strong> This checkout uses a test payment. No real
          money is taken.
        </p>
      )}

      <Link href="/cart" className="inline-flex min-h-[40px] items-center text-xs font-semibold text-green-700 hover:text-green-800">
        Edit cart
      </Link>
    </div>
  )
}
