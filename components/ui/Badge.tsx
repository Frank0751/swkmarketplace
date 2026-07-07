import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

// ─── Style map ────────────────────────────────────────────────────────────────

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-green-100 text-green-800 border-green-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-50  text-amber-700 border-amber-200',
  error:   'bg-red-50    text-red-700   border-red-200',
  info:    'bg-teal-50   text-teal-700  border-teal-200',
  neutral: 'bg-sand-100  text-sand-600  border-sand-200',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({
  variant   = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5',
        'text-xs font-medium rounded-full border',
        'whitespace-nowrap leading-5',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
