'use client'

import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const MESSAGES = [
  'Your payment is held in escrow until your order arrives',
  'Every product is checked against SDG 12 before it goes live',
  'Pay by mobile money or card',
  'Delivery anywhere in Ghana, arranged by each shop',
  'Every shop is a youth-led green business',
]

export function AnnouncementBar() {
  const [paused, setPaused] = useState(false)
  const doubled = [...MESSAGES, ...MESSAGES]

  return (
    <div className="relative bg-green-800 text-green-50 overflow-hidden h-9 flex items-center">
      {/* One static line for assistive tech. Without this the marquee reads all
          the duplicated phrases before the navigation on every page. */}
      <p className="sr-only">
        SWK Marketplace: every product is checked against SDG 12 and every payment is held in escrow.
      </p>

      <div
        aria-hidden="true"
        className="flex items-center animate-marquee"
        // Inline, because globals.css sets the `animation` shorthand for
        // .animate-marquee after Tailwind's utilities, which resets play-state.
        style={{ width: 'max-content', animationPlayState: paused ? 'paused' : 'running' }}
      >
        {doubled.map((text, i) => (
          <span key={i} className="announce-item text-xs font-medium px-6">
            {text}
            <span className="ml-12 w-1 h-1 rounded-full bg-gold-200" />
          </span>
        ))}
      </div>

      {/* WCAG 2.2.2: moving content that starts automatically needs a way to
          stop it. The CSS :hover pause is unreachable by keyboard and touch. */}
      <button
        type="button"
        onClick={() => setPaused(p => !p)}
        aria-pressed={paused}
        className={cn(
          'absolute right-0 top-0 h-9 w-9 flex items-center justify-center flex-shrink-0',
          'bg-green-800 text-white hover:bg-green-900 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset',
        )}
      >
        {paused
          ? <Play className="w-3.5 h-3.5" aria-hidden="true" />
          : <Pause className="w-3.5 h-3.5" aria-hidden="true" />}
        <span className="sr-only">
          {paused ? 'Resume scrolling announcements' : 'Pause scrolling announcements'}
        </span>
      </button>
    </div>
  )
}
