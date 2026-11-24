import Link from 'next/link'
import Image from 'next/image'
import { cn, formatCurrency } from '@/lib/utils'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { SaveButton } from '@/components/saved/SaveButton'
import { QuickView } from '@/components/marketplace/QuickView'
import type { CardProduct } from '@/types'

interface ProductCardProps {
  product: CardProduct
  /** Load the photo eagerly: for cards at the top of a page */
  priority?: boolean
}

/**
 * A product in a grid: the photo, its name, who sells it and where, the
 * price. Nothing sits on the photo except "Sample" (while samples are on
 * show) and the save button. Every listing is SDG 12 checked, so a badge
 * saying so on each card told shoppers nothing.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const primaryImage = product.images?.[0] || '/images/product-placeholder.svg'
  const isOutOfStock = product.stock_quantity === 0
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5
  const shop = product.vendor?.business_name

  return (
    // The buttons sit beside the link, not inside it: a button nested in a
    // link is invalid, and screen readers and keyboards trip over it.
    <div className="product-card card-accent group relative flex flex-col">
      <Link
        href={`/marketplace/${product.slug}`}
        className="block flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
      >
        <div className="relative w-full aspect-square overflow-hidden bg-sand-100">
          <Image
            src={primaryImage}
            alt={product.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={!canOptimizeImage(primaryImage)}
            className={cn(
              'object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]',
              isOutOfStock && 'opacity-60 grayscale',
            )}
          />
          {product.is_demo && (
            <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded bg-sand-900/75 text-white text-[11px] font-medium">
              Sample
            </span>
          )}
        </div>

        <div className="px-3 pt-3">
          <h3 className="text-sm font-bold text-sand-900 leading-snug line-clamp-2 tracking-normal group-hover:text-green-800 transition-colors">
            {product.title}
          </h3>
          {(shop || product.location) && (
            <p className="mt-1 text-xs text-sand-600 truncate">
              {[shop, product.location].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="mt-2 min-w-0 truncate">
            <span className="nums text-base font-bold text-sand-900">{formatCurrency(product.price_ghs)}</span>
            {product.unit && <span className="text-xs text-sand-600 ml-1">{product.unit}</span>}
          </p>
          {isLowStock && (
            <p className="mt-0.5 text-xs font-medium text-gold-700">Only {product.stock_quantity} left</p>
          )}
        </div>
      </Link>

      <SaveButton
        className="absolute right-2 top-2 z-10"
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          image: product.images?.[0] ?? null,
          price: product.price_ghs,
          unit: product.unit,
          vendor_name: shop,
          is_demo: !!product.is_demo,
        }}
      />

      {/* Pointer and keyboard only: on a phone a tap opens the product page */}
      <div className="hidden md:block absolute inset-x-0 top-0 aspect-square pointer-events-none">
        <QuickView
          product={product}
          className="pointer-events-auto absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        />
      </div>

      <div className="p-3">
        <AddToCartButton
          className="w-full"
          product={{
            id: product.id,
            slug: product.slug,
            title: product.title,
            images: product.images,
            unit: product.unit,
            price_ghs: product.price_ghs,
            stock_quantity: product.stock_quantity,
            minimum_order: product.minimum_order,
            is_demo: product.is_demo,
            vendor_id: product.vendor_id,
            vendor: product.vendor
              ? { id: product.vendor.id, business_name: product.vendor.business_name, slug: product.vendor.slug }
              : null,
          }}
        />
      </div>
    </div>
  )
}
