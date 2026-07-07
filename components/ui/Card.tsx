import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When provided the card becomes interactive with hover:shadow upgrade */
  onClick?:  React.MouseEventHandler<HTMLDivElement>
  padding?:  CardPadding
  className?: string
  children:  React.ReactNode
}

// ─── Padding map ──────────────────────────────────────────────────────────────

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({
  onClick,
  padding   = 'md',
  className,
  children,
  ...props
}: CardProps) {
  const isInteractive = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
              }
            }
          : undefined
      }
      className={cn(
        // Base card styles (mirrors .product-card)
        'product-card bg-white rounded-xl border border-sand-200 overflow-hidden',
        // Padding
        paddingClasses[padding],
        // Interactive extras
        isInteractive && [
          'cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
