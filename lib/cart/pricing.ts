import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'

// ─── Pricing a cart ───────────────────────────────────────────────────────────
//
// One function prices the cart everywhere: the cart drawer, the cart page, the
// checkout summary and the checkout API. The API feeds it prices read from the
// database, so what the buyer is shown is what they're charged.
//
// Delivery: each shop delivers its own items, so the flat fee is charged once
// per shop, however many of that shop's products are in the cart. It sits on
// the shop's first line, because every line becomes its own order and the fee
// has to belong to one of them (the vendor's payout then includes it, as it
// does for a single-item order).

export const round2 = (n: number) => Math.round(n * 100) / 100

export interface PriceableLine {
  product_id: string
  vendor_id: string
  vendor_name: string
  vendor_slug?: string | null
  title: string
  slug: string
  image: string | null
  unit?: string | null
  unit_price: number
  quantity: number
  is_demo: boolean
}

export interface PricedLine extends PriceableLine {
  subtotal: number
  delivery_fee: number
  total: number
}

export interface ShopGroup {
  vendor_id: string
  vendor_name: string
  vendor_slug?: string | null
  lines: PricedLine[]
  subtotal: number
  delivery_fee: number
  total: number
}

/** sample = only sample products, live = only real ones; they're paid differently */
export type CartKind = 'empty' | 'sample' | 'live' | 'mixed'

export interface PricedCart {
  shops: ShopGroup[]
  lines: PricedLine[]
  item_count: number
  subtotal: number
  delivery_total: number
  total: number
  kind: CartKind
}

export function cartKind(lines: Pick<PriceableLine, 'is_demo'>[]): CartKind {
  if (lines.length === 0) return 'empty'
  const samples = lines.filter(l => l.is_demo).length
  if (samples === lines.length) return 'sample'
  if (samples === 0) return 'live'
  return 'mixed'
}

export function priceCart(input: PriceableLine[], deliveryFee: number = DELIVERY_FEE_GHS): PricedCart {
  const shops: ShopGroup[] = []
  const byVendor = new Map<string, ShopGroup>()

  for (const line of input) {
    let shop = byVendor.get(line.vendor_id)
    const fee = shop ? 0 : deliveryFee
    const subtotal = round2(line.unit_price * line.quantity)
    const priced: PricedLine = { ...line, subtotal, delivery_fee: fee, total: round2(subtotal + fee) }

    if (!shop) {
      shop = {
        vendor_id: line.vendor_id,
        vendor_name: line.vendor_name,
        vendor_slug: line.vendor_slug,
        lines: [],
        subtotal: 0,
        delivery_fee: fee,
        total: 0,
      }
      byVendor.set(line.vendor_id, shop)
      shops.push(shop)
    }
    shop.lines.push(priced)
    shop.subtotal = round2(shop.subtotal + subtotal)
    shop.total = round2(shop.subtotal + shop.delivery_fee)
  }

  // Lines in shop order, so each shop's first line carries its delivery fee
  const lines = shops.flatMap(s => s.lines)
  const subtotal = round2(lines.reduce((sum, l) => sum + l.subtotal, 0))
  const delivery_total = round2(shops.reduce((sum, s) => sum + s.delivery_fee, 0))

  return {
    shops,
    lines,
    item_count: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    delivery_total,
    total: round2(subtotal + delivery_total),
    kind: cartKind(lines),
  }
}

// ─── Checking a cart against the catalogue ────────────────────────────────────

export interface CatalogueProduct {
  id: string
  slug: string
  title: string
  images: string[] | null
  unit?: string | null
  price_ghs: number
  stock_quantity: number
  minimum_order?: number | null
  status: string
  is_demo?: boolean | null
  vendor?: {
    id: string
    business_name: string
    slug?: string | null
    status: string
    user_id?: string | null
  } | null
}

export type LineIssue = 'unavailable' | 'out_of_stock' | 'not_enough_stock' | 'below_minimum' | 'own_product'

export interface LineProblem {
  product_id: string
  title: string
  issue: LineIssue
  /** How many can still be bought, for not_enough_stock */
  available?: number
  /** The minimum, for below_minimum */
  minimum?: number
  message: string
}

/**
 * Why a cart line can't be bought as it stands, or null if it can. Used by the
 * checkout API (authoritative) and the cart page (to explain before checkout).
 */
export function lineProblem(
  productId: string,
  quantity: number,
  product: CatalogueProduct | undefined,
  buyerId?: string | null,
  fallbackTitle = 'This item',
): LineProblem | null {
  const title = product?.title ?? fallbackTitle

  if (!product || product.status !== 'approved' || !product.vendor || product.vendor.status !== 'approved') {
    return { product_id: productId, title, issue: 'unavailable', message: `${title} is no longer available.` }
  }
  if (buyerId && product.vendor.user_id && product.vendor.user_id === buyerId) {
    return { product_id: productId, title, issue: 'own_product', message: `${title} is from your own shop, so you can’t buy it.` }
  }
  if (product.stock_quantity <= 0) {
    return { product_id: productId, title, issue: 'out_of_stock', message: `${title} is out of stock.` }
  }
  if (quantity > product.stock_quantity) {
    return {
      product_id: productId,
      title,
      issue: 'not_enough_stock',
      available: product.stock_quantity,
      message: `Only ${product.stock_quantity} of ${title} left.`,
    }
  }
  const minimum = product.minimum_order ?? 1
  if (quantity < minimum) {
    return {
      product_id: productId,
      title,
      issue: 'below_minimum',
      minimum,
      message: `${title} has a minimum order of ${minimum}.`,
    }
  }
  return null
}

/** A catalogue product as a line the pricing function understands */
export function toPriceableLine(product: CatalogueProduct, quantity: number): PriceableLine {
  return {
    product_id: product.id,
    vendor_id: product.vendor?.id ?? 'unknown',
    vendor_name: product.vendor?.business_name ?? 'Shop',
    vendor_slug: product.vendor?.slug ?? null,
    title: product.title,
    slug: product.slug,
    image: product.images?.[0] ?? null,
    unit: product.unit ?? null,
    unit_price: Number(product.price_ghs),
    quantity,
    is_demo: !!product.is_demo,
  }
}

/** The columns a cart needs from products, with the shop */
export const CART_PRODUCT_COLUMNS =
  'id, slug, title, images, unit, price_ghs, stock_quantity, minimum_order, status, is_demo, vendor:vendor_profiles(id, business_name, slug, status, user_id)'
