'use client'

import { AlertCircle, X } from 'lucide-react'
import type { CartNotice } from '@/lib/cart/CartProvider'
import { cn } from '@/lib/utils'

/** What changed since items went into the cart: a price, the stock, or availability */
export function CartNotices({
  notices,
  onDismiss,
  className,
}: {
  notices: CartNotice[]
  onDismiss?: () => void
  className?: string
}) {
  if (notices.length === 0) return null
  return (
    <div
      role="status"
      className={cn('flex items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-900', className)}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gold-600" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">Your cart was updated</p>
        <ul className="mt-1 space-y-0.5 text-xs leading-relaxed">
          {notices.map(n => (
            <li key={`${n.product_id}-${n.kind}`}>{n.message}</li>
          ))}
        </ul>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss cart updates"
          className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-gold-700 hover:bg-gold-100 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
