'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Where a buyer's money is at each stage of an order. The same four stages the
// order page tracks for real, shown here as an explanation. The line fills once,
// when the track first scrolls into view: the site's one piece of motion that
// isn't a response to a tap.

export const ESCROW_STAGES = [
  { title: 'You pay', body: 'By mobile money or card, once, for everything in your cart.', holder: 'Your money goes to SWK Ghana, not the shop.' },
  { title: 'SWK Ghana holds it', body: 'The shop sees your order and gets it ready.', holder: 'The shop has not been paid.' },
  { title: 'The shop delivers', body: 'They call you to arrange delivery, anywhere in Ghana.', holder: 'SWK Ghana is still holding your money.' },
  { title: 'You confirm', body: 'Say it arrived as described. If it didn’t, report a problem instead.', holder: 'Only now is the shop paid.' },
] as const

export function EscrowTrack({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const ref = useRef<HTMLOListElement>(null)
  const [played, setPlayed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setPlayed(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setPlayed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const last = ESCROW_STAGES.length - 1

  return (
    <ol ref={ref} className={cn('grid gap-0 md:grid-cols-4 md:gap-8', className)}>
      {ESCROW_STAGES.map((stage, i) => (
        <li key={stage.title} className="relative flex gap-4 pb-8 last:pb-0 md:block md:pb-0">
          {/* The line to the next stage: down the side on a phone, across on desktop */}
          {i < last && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute overflow-hidden',
                'left-[11px] top-6 bottom-0 w-0.5 md:left-6 md:top-[11px] md:bottom-auto md:-right-8 md:w-auto md:h-0.5',
                onDark ? 'bg-white/20' : 'bg-sand-300',
              )}
            >
              <span
                className={cn(
                  'absolute inset-0 origin-top md:origin-left transition-transform duration-700 ease-out',
                  onDark ? 'bg-green-200' : 'bg-green-600',
                  played ? 'scale-100' : 'scale-y-0 md:scale-y-100 md:scale-x-0',
                )}
                style={{ transitionDelay: `${i * 0.6 + 0.2}s` }}
              />
            </span>
          )}

          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors duration-300',
              played
                ? onDark ? 'bg-green-200 border-green-200' : 'bg-green-600 border-green-600'
                : onDark ? 'bg-green-900 border-white/30' : 'bg-white border-sand-300',
            )}
            style={{ transitionDelay: `${i * 0.6}s` }}
          />

          <div className="md:mt-5 -mt-0.5">
            <h3 className={cn('text-base font-bold tracking-normal', onDark ? 'text-white' : 'text-sand-900')}>
              {stage.title}
            </h3>
            <p className={cn('mt-1 text-sm leading-relaxed', onDark ? 'text-green-50/90' : 'text-sand-700')}>
              {stage.body}
            </p>
            <p className={cn('mt-2 text-sm font-medium', onDark ? 'text-green-100' : 'text-teal-700')}>
              {stage.holder}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
