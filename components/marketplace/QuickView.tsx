'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ProductPurchasePanel } from '@/components/cart/ProductPurchasePanel'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { cn, formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

/**
 * A look at a product without leaving the grid: photo, price, the short
 * description and the buy buttons. Shown on desktop when a card is hovered or
 * focused; on a phone a tap opens the product page, which is just as quick.
 */
export function QuickView({ product, className }: { product: Product; className?: string }) {
  const [open, setOpen] = useState(false)
  const image = product.images?.[0] || '/images/product-placeholder.svg'

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={`Quick view of ${product.title}`}
          className={cn(
            'min-h-[36px] px-3 rounded-md bg-white/95 text-xs font-bold text-sand-900 shadow-card-md',
            'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
            className,
          )}
        >
          Quick view
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-900/40 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-3xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl border border-sand-200 shadow-card-lg outline-none"
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close quick view"
              className="absolute right-3 top-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/95 text-sand-700 hover:text-sand-900 shadow-card-md"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </Dialog.Close>

          <div className="grid md:grid-cols-2">
            <div className="relative bg-sand-100 aspect-square md:aspect-auto md:min-h-[440px]">
              <Image
                src={image}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover md:rounded-l-2xl"
                unoptimized={!canOptimizeImage(image)}
              />
            </div>
            <div className="p-6 md:p-7 space-y-4">
              {product.vendor?.business_name && (
                <p className="text-sm text-sand-600">
                  {product.vendor.business_name}{product.location ? `, ${product.location}` : ''}
                </p>
              )}
              <Dialog.Title className="text-2xl font-bold tracking-tight text-sand-900 leading-tight pr-8">
                {product.title}
              </Dialog.Title>
              <p className="flex items-baseline gap-2">
                <span className="nums text-2xl font-bold text-sand-900">{formatCurrency(product.price_ghs)}</span>
                {product.unit && <span className="text-sm text-sand-600">{product.unit}</span>}
              </p>
              {product.short_description && (
                <p className="text-sm text-sand-700 leading-relaxed">{product.short_description}</p>
              )}
              <ProductPurchasePanel product={product} compact onDone={() => setOpen(false)} />
              <Link
                href={`/marketplace/${product.slug}`}
                className="link inline-flex items-center min-h-[44px] text-sm"
              >
                See full details
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
