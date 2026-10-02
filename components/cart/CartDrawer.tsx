'use client'

import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ArrowRight } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { useCartSync } from '@/lib/cart/useCartSync'
import { summarizeCart } from '@/lib/cart/summary'
import { CartLine } from '@/components/cart/CartLine'
import { CartNotices } from '@/components/cart/CartNotices'
import { formatCurrency } from '@/lib/utils'

/**
 * The cart as a side panel. Opens when something is added, so the buyer sees
 * it landed and can go straight to checkout or keep shopping.
 */
export function CartDrawer() {
  const { items, ready, drawerOpen, closeDrawer, lastAddedId } = useCart()
  const { notices, dismissNotices } = useCartSync(drawerOpen)
  const summary = summarizeCart(items)
  const shopCount = summary.shops.length
  const hasUnavailable = items.some(i => i.unavailable)

  return (
    <Dialog.Root open={drawerOpen} onOpenChange={open => { if (!open) { closeDrawer(); dismissNotices() } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-900/40 backdrop-blur-[2px] animate-fade-in" />
        <Dialog.Content
          // The panel scrolls as a whole, with the header and the checkout footer
          // pinned: on a short screen (a phone on its side) a separately
          // scrolling list was squeezed to nothing behind the footer
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto overscroll-contain bg-white shadow-card-lg outline-none animate-drawer-in"
          aria-describedby={undefined}
        >
          <div className="sticky top-0 z-10 bg-white flex items-center justify-between gap-3 px-5 h-16 border-b border-sand-200 flex-shrink-0">
            <Dialog.Title className="flex items-baseline gap-2 text-lg font-display font-bold text-sand-900">
              Your cart
              {summary.item_count > 0 && (
                <span className="text-sm font-medium text-sand-600">
                  ({summary.item_count} {summary.item_count === 1 ? 'item' : 'items'})
                </span>
              )}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close cart"
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 hover:text-sand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {!ready ? (
            <div className="flex-1 p-5 space-y-4" role="status" aria-label="Loading your cart">
              {[0, 1].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-8 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <p className="eyebrow mb-3">Nothing here yet</p>
              <p className="text-lg font-bold text-sand-900">Your cart is empty</p>
              <p className="text-sm text-sand-600 mt-1 mb-6 max-w-xs">
                Browse sustainable products from youth-led shops across Ghana.
              </p>
              <Link
                href="/marketplace"
                onClick={closeDrawer}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Start shopping <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 px-5 min-h-[7rem]">
                <CartNotices notices={notices} onDismiss={dismissNotices} className="mt-4" />
                <ul className="divide-y divide-sand-100" aria-label="Items in your cart">
                  {items.map(item => (
                    <CartLine
                      key={item.product_id}
                      item={item}
                      compact
                      highlight={item.product_id === lastAddedId}
                      onNavigate={closeDrawer}
                    />
                  ))}
                </ul>
              </div>

              {/* Pinned only where there's room for the list above it too */}
              <div className="[@media(min-height:560px)]:sticky bottom-0 flex-shrink-0 border-t border-sand-200 bg-sand-50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2.5">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-sand-700">
                    <dt>Subtotal</dt>
                    <dd className="font-medium text-sand-900 tabular-nums">{formatCurrency(summary.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-sand-700">
                    <dt>
                      Delivery{shopCount > 1 ? ` (${shopCount} shops)` : ''}
                    </dt>
                    <dd className="font-medium text-sand-900 tabular-nums">{formatCurrency(summary.delivery_total)}</dd>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-sand-200 text-base font-bold text-sand-900">
                    <dt>Total</dt>
                    <dd className="tabular-nums text-green-700">{formatCurrency(summary.total)}</dd>
                  </div>
                </dl>

                {summary.kind === 'sample' && (
                  <p className="text-xs text-gold-800">Sample products: test payment, no real money taken.</p>
                )}
                {summary.kind === 'mixed' && (
                  <p className="text-xs text-red-700">
                    Sample and real products are paid separately. Open your cart to sort them.
                  </p>
                )}
                {hasUnavailable && (
                  <p className="text-xs text-sand-600">Items that are no longer available aren’t included.</p>
                )}

                {summary.lines.length > 0 && summary.kind !== 'mixed' ? (
                  <Link
                    href="/checkout"
                    onClick={closeDrawer}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
                  >
                    Checkout · {formatCurrency(summary.total)}
                  </Link>
                ) : (
                  <Link
                    href="/cart"
                    onClick={closeDrawer}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    Review cart
                  </Link>
                )}
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href="/cart"
                    onClick={closeDrawer}
                    className="inline-flex items-center min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
                  >
                    View full cart
                  </Link>
                  <span className="text-xs font-medium text-teal-700">Escrow protected</span>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
