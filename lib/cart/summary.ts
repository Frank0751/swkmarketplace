import { priceCart, type PricedCart } from '@/lib/cart/pricing'
import type { CartItem } from '@/lib/cart/CartProvider'

/** Price the cart's available lines, exactly as the checkout API will */
export function summarizeCart(items: CartItem[]): PricedCart {
  return priceCart(
    items
      .filter(i => !i.unavailable && i.quantity > 0)
      .map(i => ({
        product_id:  i.product_id,
        vendor_id:   i.vendor_id,
        vendor_name: i.vendor_name,
        vendor_slug: i.vendor_slug,
        title:       i.title,
        slug:        i.slug,
        image:       i.image,
        unit:        i.unit,
        unit_price:  i.unit_price,
        quantity:    i.quantity,
        is_demo:     i.is_demo,
      })),
  )
}
