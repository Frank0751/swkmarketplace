import * as React from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?:   ButtonVariant
  size?:      ButtonSize
  isLoading?: boolean
}

// Overloads: render as <button> or as <a>
type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    as?: 'button'
    href?: never
  }

type ButtonAsAnchor = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    as: 'a'
    href: string
  }

type ButtonProps = ButtonAsButton | ButtonAsAnchor

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-green-600 text-white shadow-sm hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-600 disabled:bg-green-300',
  secondary: 'bg-white text-sand-900 border border-sand-300 shadow-sm hover:bg-sand-50 active:bg-sand-100 focus-visible:ring-sand-400 disabled:text-sand-400 disabled:border-sand-200',
  ghost:     'bg-transparent text-sand-700 hover:bg-sand-100 active:bg-sand-200 focus-visible:ring-sand-400 disabled:text-sand-300',
  danger:    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 disabled:bg-red-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8  px-3   text-xs  gap-1.5 rounded-lg',
  md: 'h-10 px-4   text-sm  gap-2   rounded-lg',
  lg: 'h-12 px-6   text-base gap-2.5 rounded-xl',
}

const spinnerSizes: Record<ButtonSize, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef(function Button(
  props: ButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const {
    variant    = 'primary',
    size       = 'md',
    isLoading  = false,
    className,
    children,
    ...rest
  } = props

  const classes = cn(
    // Base
    'inline-flex items-center justify-center font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none select-none',
    // Variant + size
    variantClasses[variant],
    sizeClasses[size],
    // Loading state dims slightly
    isLoading && 'opacity-80 pointer-events-none',
    className,
  )

  const content = (
    <>
      {isLoading && (
        <Spinner
          size={spinnerSizes[size]}
          className={variant === 'primary' || variant === 'danger' ? 'text-white/80' : 'text-sand-400'}
        />
      )}
      {children}
    </>
  )

  if (props.as === 'a') {
    const { as: _as, variant: _v, size: _s, isLoading: _l, ...anchorRest } = rest as ButtonAsAnchor & { as: 'a' }
    return (
      <a
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        className={classes}
        {...anchorRest}
      >
        {content}
      </a>
    )
  }

  const { as: _as, ...buttonRest } = rest as ButtonAsButton & { as?: 'button' }
  return (
    <button
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
      className={classes}
      disabled={(buttonRest as React.ButtonHTMLAttributes<HTMLButtonElement>).disabled || isLoading}
      {...(buttonRest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
})

Button.displayName = 'Button'
