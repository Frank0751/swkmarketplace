'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ShoppingBag } from 'lucide-react'
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
export function ProductPurchasePanel({
  product,
  compact = false,
  onDone,
}: {
  product: Product
  /** In the quick view: buttons only, without the delivery notes */
  compact?: boolean
  /** Called once something was added, so a dialog can close itself */
  onDone?: () => void
}) {
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
    onDone?.()
    openDrawer()
  }

  function handleBuyNow() {
    if (!add()) return
    onDone?.()
    router.push('/checkout')
  }

  if (isOutOfStock) {
    return (
      <div className="p-4 rounded-xl bg-sand-100 border border-sand-200">
        <p className="text-sm font-bold text-sand-900">Sold out</p>
        <p className="text-sm text-sand-700 mt-0.5">Save it and check back: the shop may restock.</p>
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

      {quantity > 1 && (
        <p className="flex items-baseline justify-between text-sm text-sand-700">
          <span>{quantity} × {formatCurrency(product.price_ghs)}</span>
          <span className="nums text-lg font-bold text-sand-900">{formatCurrency(product.price_ghs * quantity)}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={roomLeft === 0}
          data-buy-button
          className="btn btn-primary btn-lg w-full"
        >
          {added ? <Check className="w-4 h-4 animate-pop-in" aria-hidden="true" /> : <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
          {roomLeft === 0 ? 'All stock is in your cart' : added ? 'Added to cart' : 'Add to cart'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="btn btn-secondary btn-lg w-full"
        >
          Buy now
        </button>
      </div>

      {!compact && (
        <dl className="border-t border-sand-200 pt-4 space-y-3 text-sm">
          <div className="grid grid-cols-[6.5rem,1fr] gap-3">
            <dt className="font-bold text-sand-900">Delivery</dt>
            <dd className="text-sand-700">
              Anywhere in Ghana, {formatCurrency(DELIVERY_FEE_GHS)} per shop. The shop calls you to arrange it.
            </dd>
          </div>
          <div className="grid grid-cols-[6.5rem,1fr] gap-3">
            <dt className="font-bold text-sand-900">Payment</dt>
            <dd className="text-sand-700">
              Mobile money or card. SWK Ghana holds it, and the shop is paid only after you confirm delivery.
            </dd>
          </div>
          {product.is_demo && (
            <div className="grid grid-cols-[6.5rem,1fr] gap-3">
              <dt className="font-bold text-sand-900">Sample</dt>
              <dd className="text-sand-700">
                This is a sample product. Checkout works with a test card or mobile money and no money is taken.{' '}
                <Link href="/how-it-works#samples" className="link">About the samples</Link>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
