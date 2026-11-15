import Link from 'next/link'
import Image from 'next/image'
import { canOptimizeImage } from '@/lib/marketplace/images'
import type { SearchShop } from '@/lib/search/rank'

/** A shop in a list: its photo, name, town, what it makes and how much it sells */
export function ShopCard({ shop }: { shop: SearchShop }) {
  const image = shop.logo || '/images/store-banner.jpg'

  return (
    <Link
      href={`/store/${shop.slug}`}
      className="product-card card-accent group flex gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
    >
      <span className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-sand-100">
        <Image
          src={image}
          alt=""
          fill
          sizes="96px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          unoptimized={!canOptimizeImage(image)}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-base font-bold text-sand-900 truncate group-hover:text-green-800 transition-colors">
            {shop.name}
          </span>
          {shop.is_demo && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sand-100 text-sand-700 text-[11px] font-medium">Sample</span>
          )}
        </span>
        <span className="block text-xs text-sand-600 mt-0.5">
          {shop.location}, {shop.region} · {shop.category}
        </span>
        <span className="block text-sm text-sand-700 mt-2 leading-snug line-clamp-2">{shop.blurb}</span>
        <span className="block text-xs font-medium text-green-800 mt-2">
          {shop.product_count} {shop.product_count === 1 ? 'product' : 'products'}
        </span>
      </span>
    </Link>
  )
}
