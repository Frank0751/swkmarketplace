'use client'

import { useState } from 'react'
import { BadgeCheck, ShieldCheck, Users, Truck, Recycle, HeartHandshake, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const MESSAGES = [
  { icon: BadgeCheck, text: 'Every product is SDG 12-verified before going live' },
  { icon: ShieldCheck, text: 'All payments are escrow-protected, your money is safe' },
  { icon: Users, text: '100% youth-led green entrepreneurs' },
  { icon: Truck, text: 'Shipping across Ghana and Africa' },
  { icon: Recycle, text: 'Supporting responsible consumption since 2022' },
  { icon: HeartHandshake, text: 'Every purchase empowers a young Ghanaian entrepreneur' },
]

export function AnnouncementBar() {
  const [paused, setPaused] = useState(false)
  const doubled = [...MESSAGES, ...MESSAGES]

  return (
    <div className="relative bg-green-600 text-white overflow-hidden h-9 flex items-center">
      {/* One static line for assistive tech. Without this the marquee reads all
          twelve duplicated phrases before the navigation on every page. */}
      <p className="sr-only">
        SWK Marketplace: every product is SDG 12-verified and all payments are escrow-protected.
      </p>

      <div
        aria-hidden="true"
        className="flex items-center gap-12 animate-marquee"
        // Inline, because globals.css sets the `animation` shorthand for
        // .animate-marquee after Tailwind's utilities, which resets play-state.
        style={{ width: 'max-content', animationPlayState: paused ? 'paused' : 'running' }}
      >
        {doubled.map((msg, i) => {
          const Icon = msg.icon
          return (
            <span key={i} className="announce-item text-xs font-medium">
              <Icon className="w-3.5 h-3.5 text-green-50" aria-hidden="true" />
              <span>{msg.text}</span>
              <span className="text-green-50 mx-2">·</span>
            </span>
          )
        })}
      </div>

      {/* WCAG 2.2.2: moving content that starts automatically needs a way to
          stop it. The CSS :hover pause is unreachable by keyboard and touch. */}
      <button
        type="button"
        onClick={() => setPaused(p => !p)}
        aria-pressed={paused}
        className={cn(
          'absolute right-0 top-0 h-9 w-9 flex items-center justify-center flex-shrink-0',
          'bg-green-600 text-white hover:bg-green-700 transition-colors',
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
