'use client'

import { useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart, type CartProductInput } from '@/lib/cart/CartProvider'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  product: CartProductInput
  className?: string
}

/** The compact "Add" button on a product card */
export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { addItem, openDrawer, items } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const soldOut = product.stock_quantity <= 0
  const inCart = items.find(i => i.product_id === product.id && !i.unavailable)?.quantity ?? 0

  function handleAdd() {
    const result = addItem(product, Math.max(1, product.minimum_order ?? 1))
    if (result.full) {
      toast.error('Your cart is full. Check out or remove something first.')
      return
    }
    if (result.capped) {
      toast(`That’s all ${product.stock_quantity} in stock, and they’re in your cart.`)
    }
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1600)
    openDrawer()
  }

  if (soldOut) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sand-100 text-sand-600',
          className,
        )}
      >
        Sold out
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={inCart > 0 ? `Add another ${product.title} to cart (${inCart} in cart)` : `Add ${product.title} to cart`}
      className={cn(
        'inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg text-xs font-semibold shadow-card transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
        justAdded ? 'bg-green-700 text-white' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
        className,
      )}
    >
      {justAdded ? (
        <Check className="w-3.5 h-3.5 animate-pop-in" aria-hidden="true" />
      ) : (
        <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {justAdded ? 'Added' : 'Add'}
    </button>
  )
}
