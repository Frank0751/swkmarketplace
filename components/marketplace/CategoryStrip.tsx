'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CATEGORY_META, ProductCategory } from '@/types'

const CATEGORIES = Object.entries(CATEGORY_META) as [ProductCategory, { label: string; emoji: string; description: string }][]

function CategoryStripInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category') as ProductCategory | null

  function handleClick(category: ProductCategory | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    // Reset pagination when changing category
    params.delete('page')
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <div className="py-4 border-b border-sand-200 bg-white sticky top-16 z-30">
      <div className="container-app">
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
          role="group"
          aria-label="Filter by category"
        >
          {/* All pill */}
          <button
            onClick={() => handleClick(null)}
            className={cn(
              'category-pill flex-shrink-0',
              !activeCategory && 'active'
            )}
            aria-pressed={!activeCategory}
          >
            All
          </button>

          {/* Category pills */}
          {CATEGORIES.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => handleClick(key)}
              className={cn(
                'category-pill flex-shrink-0 flex items-center gap-1.5',
                activeCategory === key && 'active'
              )}
              aria-pressed={activeCategory === key}
            >
              <span role="img" aria-hidden="true">{meta.emoji}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CategoryStrip() {
  return (
    <Suspense
      fallback={
        <div className="py-4 border-b border-sand-200 bg-white sticky top-16 z-30">
          <div className="container-app">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-8 rounded-full flex-shrink-0"
                  style={{ width: i === 0 ? 48 : 120 }}
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <CategoryStripInner />
    </Suspense>
  )
}
