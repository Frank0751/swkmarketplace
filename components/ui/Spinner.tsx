import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const px = sizeMap[size]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={cn('animate-spin flex-shrink-0', className)}
      aria-hidden="true"
      role="status"
      {...props}
    >
      {/* Full circle (dim track) */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={2.5}
        fill="none"
      />
      {/* Quarter-arc (spinning head) */}
      <path
        d="M12 2 a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
