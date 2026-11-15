'use client'

import { Search } from 'lucide-react'
import { useSearch } from '@/components/search/SearchProvider'
import { cn } from '@/lib/utils'

/** A large search field for the home page. Opens the search window. */
export function SearchField({ className }: { className?: string }) {
  const search = useSearch()

  return (
    <button
      type="button"
      onClick={() => search.open()}
      onMouseEnter={search.warm}
      onFocus={search.warm}
      className={cn(
        'flex items-center gap-3 w-full min-h-[56px] px-4 rounded-xl bg-white border border-sand-300 text-left text-base text-sand-600',
        'hover:border-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
        className,
      )}
    >
      <Search className="w-5 h-5 flex-shrink-0 text-sand-700" aria-hidden="true" />
      <span className="flex-1">Search honey, soap, a veggie box…</span>
      <span className="hidden sm:inline-flex items-center justify-center min-h-[36px] px-4 rounded-lg bg-green-600 text-white text-sm font-bold">
        Search
      </span>
    </button>
  )
}
