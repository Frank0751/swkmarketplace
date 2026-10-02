import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { Product, CATEGORY_META, VALUE_TAG_META, ValueTag } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.[0] || '/images/product-placeholder.svg'
  const categoryMeta = CATEGORY_META[product.category]
  const hasSDG12 = product.sdg_tags?.includes('sdg_12_responsible_consumption')
  const visibleValueTags = (product.value_tags || []).slice(0, 2) as ValueTag[]

  const isOutOfStock = product.stock_quantity === 0
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5
  const isSample = !!product.is_demo

  return (
    // The add button sits beside the link, not inside it: a button nested in
    // a link is invalid, and screen readers and keyboards trip over it.
    <div className="product-card card-accent group relative flex flex-col">
      <Link
        href={`/marketplace/${product.slug}`}
        className="block flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
        // No aria-label: it replaced the accessible name, so a screen reader
        // skimming the grid heard only "View <title>" with no vendor, price or
        // stock. Letting the card's own content name the link restores all of it.
      >
        {/* Image container */}
        <div className="relative w-full overflow-hidden rounded-lg bg-sand-100"
          style={{ aspectRatio: '4/3' }}
        >
          <Image
            src={primaryImage}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={!canOptimizeImage(primaryImage)}
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              isOutOfStock && 'opacity-60 grayscale'
            )}
          />

          {/* SDG 12 badge */}
          {hasSDG12 && (
            <div className="absolute top-2 left-2">
              <span className="sdg-badge text-[10px] px-1.5 py-0.5">
                SDG 12 ✓
              </span>
            </div>
          )}

          {/* Stock and sample badges, top right */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {isSample && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-sand-900/70 backdrop-blur-sm text-white rounded-full">
                Sample
              </span>
            )}
            {isOutOfStock && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-sand-800 text-white rounded-full">
                Out of stock
              </span>
            )}
            {isLowStock && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gold-400 text-white rounded-full">
                Only {product.stock_quantity} left
              </span>
            )}
          </div>

          {/* Category pill, bottom left */}
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 text-[10px] font-medium bg-white/90 backdrop-blur-sm text-sand-700 rounded-full flex items-center shadow-card">
              <span>{categoryMeta?.label}</span>
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3">
          {/* Vendor */}
          {product.vendor?.business_name && (
            <p className="text-[11px] font-medium text-green-600 truncate mb-0.5">
              {product.vendor.business_name}
            </p>
          )}

          {/* Title */}
          <h3 className="text-sm font-semibold text-sand-900 line-clamp-2 leading-snug mb-1">
            {product.title}
          </h3>

          {/* Location */}
          {product.location && (
            <div className="flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3 text-sand-600 flex-shrink-0" aria-hidden="true" />
              <span className="text-[11px] text-sand-600 truncate">{product.location}</span>
            </div>
          )}

          {/* Value tags */}
          {visibleValueTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {visibleValueTags.map(tag => {
                const meta = VALUE_TAG_META[tag]
                return meta ? (
                  <span key={tag} className="value-tag text-[10px] px-1.5 py-0.5 pointer-events-none">
                    {meta.label}
                  </span>
                ) : null
              })}
            </div>
          )}

          {/* Price. min-w-0 + truncate: at 360px a card is ~156px wide and a
              long price plus unit would otherwise overflow it. */}
          <div className="min-w-0 truncate">
            <span className="text-base font-bold text-sand-900">
              {formatCurrency(product.price_ghs)}
            </span>
            {product.unit && (
              <span className="text-[11px] text-sand-600 ml-1 truncate">{product.unit}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Below the price rather than beside it: on a two-column phone grid the
          button covered the end of the price */}
      <div className="px-3 pb-3">
        <AddToCartButton
          className="w-full justify-center"
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
