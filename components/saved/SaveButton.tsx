'use client'

import { Heart } from 'lucide-react'
import { useSaved, type ProductSnapshotInput } from '@/lib/local/lists'
import { cn } from '@/lib/utils'

interface SaveButtonProps {
  product: ProductSnapshotInput
  /** 'icon' sits on a product photo; 'button' sits beside Add to cart */
  variant?: 'icon' | 'button'
  className?: string
}

/** Saves a product to this browser's saved list, or takes it off again */
export function SaveButton({ product, variant = 'icon', className }: SaveButtonProps) {
  const { isSaved, toggle } = useSaved()
  const saved = isSaved(product.id)

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => toggle(product)}
        aria-pressed={saved}
        className={cn('btn btn-secondary', className)}
      >
        <Heart className={cn('w-4 h-4', saved && 'fill-green-600 text-green-600')} aria-hidden="true" />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggle(product)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.title} from saved items` : `Save ${product.title}`}
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-full bg-white/95 text-sand-800 shadow-card-md',
        'transition-transform active:scale-90 hover:text-green-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
        className,
      )}
    >
      <Heart
        key={saved ? 'on' : 'off'}
        className={cn('w-[18px] h-[18px]', saved && 'fill-green-600 text-green-600 animate-pop-in')}
        aria-hidden="true"
      />
    </button>
  )
}
