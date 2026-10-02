'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useCart, type CartItem } from '@/lib/cart/CartProvider'
import { QuantityStepper } from '@/components/cart/QuantityStepper'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { cn, formatCurrency } from '@/lib/utils'

interface CartLineProps {
  item: CartItem
  /** Compact layout for the drawer */
  compact?: boolean
  highlight?: boolean
  onNavigate?: () => void
  showVendor?: boolean
}

export function CartLine({ item, compact = false, highlight = false, onNavigate, showVendor = true }: CartLineProps) {
  const { setQuantity, removeItem } = useCart()
  const image = item.image || '/images/product-placeholder.svg'
  const lineTotal = item.unit_price * item.quantity

  return (
    <li
      className={cn(
        'flex gap-3 py-4 transition-colors',
        highlight && 'bg-green-50/60 -mx-3 px-3 rounded-xl',
      )}
    >
      <Link
        href={`/marketplace/${item.slug}`}
        onClick={onNavigate}
        className={cn(
          'relative flex-shrink-0 overflow-hidden rounded-lg bg-sand-100 border border-sand-200',
          compact ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24',
        )}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="96px"
          className={cn('object-cover', item.unavailable && 'grayscale opacity-60')}
          unoptimized={!canOptimizeImage(image)}
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {showVendor && (
              <p className="text-[11px] font-medium text-green-700 truncate">{item.vendor_name}</p>
            )}
            <Link
              href={`/marketplace/${item.slug}`}
              onClick={onNavigate}
              className="block text-sm font-semibold text-sand-900 leading-snug hover:text-green-700 transition-colors line-clamp-2"
            >
              {item.title}
            </Link>
            <p className="text-xs text-sand-600 mt-0.5">
              {formatCurrency(item.unit_price)}{item.unit ? ` ${item.unit}` : ''}
              {item.is_demo && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-px rounded-full bg-gold-50 text-gold-700 border border-gold-100 text-[10px] font-semibold align-middle">
                  Sample
                </span>
              )}
            </p>
          </div>
          {!compact && !item.unavailable && (
            <p className="text-sm font-bold text-sand-900 tabular-nums flex-shrink-0">{formatCurrency(lineTotal)}</p>
          )}
        </div>

        {item.unavailable ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              {item.max_quantity <= 0 ? 'Sold out' : 'No longer available'}
            </span>
            <button
              type="button"
              onClick={() => removeItem(item.product_id)}
              className="inline-flex items-center gap-1 min-h-[36px] text-xs font-semibold text-sand-700 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <QuantityStepper
              size="sm"
              value={item.quantity}
              min={item.min_quantity}
              max={item.max_quantity}
              onChange={q => setQuantity(item.product_id, q)}
              label={`Quantity of ${item.title}`}
            />
            <div className="flex items-center gap-1">
              {compact && (
                <span className="text-sm font-bold text-sand-900 tabular-nums mr-1">{formatCurrency(lineTotal)}</span>
              )}
              <button
                type="button"
                onClick={() => removeItem(item.product_id)}
                aria-label={`Remove ${item.title} from cart`}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-sand-600 hover:text-red-700 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {!item.unavailable && item.quantity >= item.max_quantity && (
          <p className="mt-1 text-[11px] text-gold-700">That’s all the stock this shop has.</p>
        )}
      </div>
    </li>
  )
}
