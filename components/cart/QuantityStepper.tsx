'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Names the product for screen readers: "Quantity of Raw Forest Honey" */
  label: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

/**
 * Minus / count / plus. The count is announced politely when it changes, and
 * the buttons say which product they change, since a cart has several.
 */
export function QuantityStepper({
  value,
  min,
  max,
  onChange,
  label,
  size = 'md',
  disabled = false,
  className,
}: QuantityStepperProps) {
  const button = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
  const atMin = value <= min
  const atMax = value >= max

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center rounded-lg border border-sand-200 bg-white', className)}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || atMin}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={cn(
          button,
          'flex items-center justify-center rounded-l-lg text-sand-700 hover:bg-sand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
        )}
      >
        <Minus className="w-4 h-4" aria-hidden="true" />
      </button>
      <span
        className={cn('min-w-[2.5rem] px-1 text-center font-semibold text-sand-900 tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || atMax}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={cn(
          button,
          'flex items-center justify-center rounded-r-lg text-sand-700 hover:bg-sand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
        )}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
