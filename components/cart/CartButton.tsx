'use client'

import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { cn } from '@/lib/utils'

/** Navbar cart icon with a count. Opens the cart drawer. */
export function CartButton({ className }: { className?: string }) {
  const { count, ready, openDrawer } = useCart()
  const label = count === 0 ? 'Cart, empty' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={label}
      className={cn(
        'relative w-11 h-11 flex items-center justify-center rounded-lg text-sand-700 hover:bg-sand-100 hover:text-sand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
        className,
      )}
    >
      <ShoppingBag className="w-5 h-5" aria-hidden="true" />
      {ready && count > 0 && (
        <span
          key={count}
          aria-hidden="true"
          className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums animate-pop-in"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
