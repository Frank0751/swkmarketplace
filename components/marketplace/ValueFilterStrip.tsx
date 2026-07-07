'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { VALUE_TAG_META, ValueTag } from '@/types'

const VALUE_TAGS = Object.entries(VALUE_TAG_META) as [ValueTag, { label: string; icon: string }][]

function ValueFilterStripInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawValues = searchParams.get('values')
  const activeValues: ValueTag[] = rawValues
    ? (rawValues.split(',').filter(Boolean) as ValueTag[])
    : []

  function handleToggle(tag: ValueTag) {
    const params = new URLSearchParams(searchParams.toString())
    const next = activeValues.includes(tag)
      ? activeValues.filter(v => v !== tag)
      : [...activeValues, tag]

    if (next.length === 0) {
      params.delete('values')
    } else {
      params.set('values', next.join(','))
    }
    // Reset pagination when changing filters
    params.delete('page')
    router.push(`/marketplace?${params.toString()}`)
  }

  if (VALUE_TAGS.length === 0) return null

  return (
    <div className="py-3 bg-sand-50 border-b border-sand-200">
      <div className="container-app">
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
          role="group"
          aria-label="Filter by value"
        >
          <span className="text-xs font-medium text-sand-400 flex-shrink-0 mr-1">
            Shop by values:
          </span>
          {VALUE_TAGS.map(([key, meta]) => {
            const isActive = activeValues.includes(key)
            return (
              <button
                key={key}
                onClick={() => handleToggle(key)}
                className={cn(
                  'value-tag flex-shrink-0 flex items-center gap-1',
                  isActive && 'active'
                )}
                aria-pressed={isActive}
              >
                <span role="img" aria-hidden="true" className="text-sm">
                  {meta.icon}
                </span>
                {meta.label}
              </button>
            )
          })}

          {activeValues.length > 0 && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.delete('values')
                params.delete('page')
                router.push(`/marketplace?${params.toString()}`)
              }}
              className="flex-shrink-0 text-xs text-sand-500 hover:text-sand-900 underline underline-offset-2 ml-1 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ValueFilterStrip() {
  return (
    <Suspense
      fallback={
        <div className="py-3 bg-sand-50 border-b border-sand-200">
          <div className="container-app">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <div className="skeleton h-6 w-24 rounded-full flex-shrink-0" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-6 w-28 rounded-full flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ValueFilterStripInner />
    </Suspense>
  )
}
