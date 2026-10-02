'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Check, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart } from '@/lib/cart/CartProvider'
import { QuantityStepper } from '@/components/cart/QuantityStepper'
import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

/**
 * Quantity, Add to cart and Buy now on the product page. Replaces the old
 * one-product order form: buyers can now fill a cart from several shops and
 * pay once.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter()
  const { addItem, openDrawer, items } = useCart()
  const min = Math.max(1, product.minimum_order || 1)
  const stock = product.stock_quantity
  const [quantity, setQuantity] = useState(Math.min(min, Math.max(stock, 1)))
  const [added, setAdded] = useState(false)

  const inCart = items.find(i => i.product_id === product.id && !i.unavailable)?.quantity ?? 0
  const roomLeft = Math.max(0, stock - inCart)
  const isOutOfStock = stock <= 0
  const isLowStock = stock > 0 && stock < 5

  const cartProduct = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    images: product.images,
    unit: product.unit,
    price_ghs: product.price_ghs,
    stock_quantity: stock,
    minimum_order: product.minimum_order,
    is_demo: product.is_demo,
    vendor_id: product.vendor_id,
    vendor: product.vendor
      ? { id: product.vendor.id, business_name: product.vendor.business_name, slug: product.vendor.slug }
      : null,
  }

  function add(): boolean {
    const result = addItem(cartProduct, quantity)
    if (result.full) {
      toast.error('Your cart is full. Check out or remove something first.')
      return false
    }
    if (result.capped) {
      toast(`Only ${stock} in stock, so your cart has ${result.quantity}.`)
    }
    return true
  }

  function handleAdd() {
    if (!add()) return
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
    openDrawer()
  }

  function handleBuyNow() {
    if (!add()) return
    router.push('/checkout')
  }

  if (isOutOfStock) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-sand-100 border border-sand-200">
        <AlertCircle className="w-5 h-5 text-sand-600 flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-sand-700">Out of stock</p>
          <p className="text-xs text-sand-600 mt-0.5">This product is temporarily unavailable. Check back soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="form-label" id="quantity-label">
            Quantity{product.unit ? ` (${product.unit})` : ''}
          </p>
          <QuantityStepper
            value={quantity}
            min={min}
            max={Math.max(min, stock)}
            onChange={setQuantity}
            label={`Quantity of ${product.title}`}
          />
        </div>
        <div className="text-xs text-sand-600 space-y-0.5 pt-5">
          <p className={isLowStock ? 'font-semibold text-gold-700' : 'text-green-700 font-medium'}>
            {isLowStock ? `Only ${stock} left` : `In stock (${stock} available)`}
          </p>
          {min > 1 && <p>Minimum order: {min}</p>}
          {inCart > 0 && (
            <p>
              {inCart} already in your cart.{' '}
              <button type="button" onClick={openDrawer} className="font-semibold text-green-700 underline underline-offset-2">
                View cart
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="bg-sand-50 rounded-xl border border-sand-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-sand-700">
          {quantity} × {formatCurrency(product.price_ghs)}
        </span>
        <span className="text-lg font-bold text-sand-900 tabular-nums">
          {formatCurrency(product.price_ghs * quantity)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={roomLeft === 0}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          {added ? <Check className="w-4 h-4 animate-pop-in" aria-hidden="true" /> : <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
          {roomLeft === 0 ? 'All stock is in your cart' : added ? 'Added to cart' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-green-600 bg-white text-green-700 text-sm font-semibold hover:bg-green-50 active:bg-green-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          Buy now
        </button>
      </div>

      <ul className="space-y-2.5 text-sm text-sand-700 border-t border-sand-200 pt-4">
        <li className="flex gap-2.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-sand-900">Delivery anywhere in Ghana</strong> for{' '}
            {formatCurrency(DELIVERY_FEE_GHS)} per shop. The shop calls you to arrange it.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-sand-900">Escrow protected.</strong> The shop is paid only after you
            confirm delivery.
          </span>
        </li>
        {product.is_demo && (
          <li className="flex gap-2.5">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-sand-900">Sample product.</strong> Checkout works end to end with a
              test card or mobile money; no real money is taken.{' '}
              <Link href="/how-it-works" className="text-green-700 underline underline-offset-2">How it works</Link>
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
