'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X, ArrowRight } from 'lucide-react'
import { searchCatalogue, type SearchIndex } from '@/lib/search/rank'
import { useRecentSearches, useRecentlyViewed } from '@/lib/local/lists'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { cn, formatCurrency } from '@/lib/utils'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
  initialQuery: string
  index: SearchIndex | null
  failed: boolean
  onRetry: () => void
}

interface Option {
  id: string
  href: string
  /** Read out for the option */
  label: string
  kind: 'product' | 'shop' | 'category' | 'recent' | 'all'
  node: React.ReactNode
  /** Remembered as a recent search when chosen */
  term?: string
}

const MAX_PRODUCTS = 6
const MAX_SHOPS = 3

function Thumb({ src, round }: { src: string | null; round?: boolean }) {
  const image = src || '/images/product-placeholder.svg'
  return (
    <span className={cn('relative flex-shrink-0 w-11 h-11 overflow-hidden bg-sand-100', round ? 'rounded-full' : 'rounded-md')}>
      <Image src={image} alt="" fill sizes="44px" className="object-cover" unoptimized={!canOptimizeImage(image)} />
    </span>
  )
}

export function SearchDialog({ open, onClose, initialQuery, index, failed, onRetry }: SearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const recentSearches = useRecentSearches()
  const recentlyViewed = useRecentlyViewed()

  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setActive(-1)
    }
  }, [open, initialQuery])

  const trimmed = query.trim()
  const results = useMemo(
    () => (index && trimmed ? searchCatalogue(index, trimmed) : null),
    [index, trimmed],
  )

  const groups = useMemo(() => {
    const out: { title: string; options: Option[] }[] = []

    if (!trimmed) {
      if (recentSearches.items.length) {
        out.push({
          title: 'Recent searches',
          options: recentSearches.items.map(term => ({
            id: `recent-${term}`,
            href: `/marketplace?search=${encodeURIComponent(term)}`,
            label: term,
            kind: 'recent' as const,
            term,
            node: <span className="text-sm text-sand-800">{term}</span>,
          })),
        })
      }
      if (recentlyViewed.length) {
        out.push({
          title: 'Recently viewed',
          options: recentlyViewed.slice(0, 4).map(p => ({
            id: `viewed-${p.id}`,
            href: `/marketplace/${p.slug}`,
            label: p.title,
            kind: 'product' as const,
            node: (
              <>
                <Thumb src={p.image} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-sand-900">{p.title}</span>
                  <span className="block truncate text-xs text-sand-600">{p.vendor_name}</span>
                </span>
                <span className="nums text-sm font-bold text-sand-900">{formatCurrency(p.price)}</span>
              </>
            ),
          })),
        })
      }
      if (index?.categories.length) {
        out.push({
          title: 'Browse',
          options: index.categories.map(c => ({
            id: `cat-${c.key}`,
            href: `/marketplace?category=${c.key}`,
            label: c.label,
            kind: 'category' as const,
            node: <span className="text-sm text-sand-800">{c.label}</span>,
          })),
        })
      }
      return out
    }

    if (!results) return out

    if (results.products.length) {
      out.push({
        title: 'Products',
        options: results.products.slice(0, MAX_PRODUCTS).map(p => ({
          id: `product-${p.id}`,
          href: `/marketplace/${p.slug}`,
          label: `${p.title}, ${formatCurrency(p.price)}, from ${p.vendor_name}`,
          kind: 'product' as const,
          term: trimmed,
          node: (
            <>
              <Thumb src={p.image} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sand-900">{p.title}</span>
                <span className="block truncate text-xs text-sand-600">
                  {p.vendor_name}{p.location ? `, ${p.location}` : ''}{!p.in_stock ? ' · Sold out' : ''}
                </span>
              </span>
              <span className="nums text-sm font-bold text-sand-900">{formatCurrency(p.price)}</span>
            </>
          ),
        })),
      })
    }
    if (results.shops.length) {
      out.push({
        title: 'Shops',
        options: results.shops.slice(0, MAX_SHOPS).map(s => ({
          id: `shop-${s.id}`,
          href: `/store/${s.slug}`,
          label: `${s.name}, shop in ${s.location}`,
          kind: 'shop' as const,
          term: trimmed,
          node: (
            <>
              <Thumb src={s.logo} round />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sand-900">{s.name}</span>
                <span className="block truncate text-xs text-sand-600">
                  {s.location}, {s.region} · {s.product_count} {s.product_count === 1 ? 'product' : 'products'}
                </span>
              </span>
            </>
          ),
        })),
      })
    }
    if (results.categories.length) {
      out.push({
        title: 'Categories',
        options: results.categories.map(c => ({
          id: `cat-${c.key}`,
          href: `/marketplace?category=${c.key}`,
          label: c.label,
          kind: 'category' as const,
          node: <span className="text-sm text-sand-800">{c.label}</span>,
        })),
      })
    }
    if (results.products.length > MAX_PRODUCTS) {
      out.push({
        title: '',
        options: [{
          id: 'all-results',
          href: `/marketplace?search=${encodeURIComponent(trimmed)}`,
          label: `See all ${results.products.length} products for ${trimmed}`,
          kind: 'all' as const,
          term: trimmed,
          node: (
            <span className="flex items-center gap-2 text-sm font-bold text-green-800">
              See all {results.products.length} products
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          ),
        }],
      })
    }
    return out
  }, [trimmed, results, index, recentSearches.items, recentlyViewed])

  const options = useMemo(() => groups.flatMap(g => g.options), [groups])
  const nothingFound = !!trimmed && !!results && options.length === 0

  useEffect(() => { setActive(-1) }, [trimmed])

  // Keep the highlighted result in view
  useEffect(() => {
    if (active < 0) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function go(option: Option) {
    if (option.term) recentSearches.add(option.term)
    onClose()
    router.push(option.href)
  }

  function submit() {
    if (active >= 0 && options[active]) {
      go(options[active])
      return
    }
    if (!trimmed) return
    recentSearches.add(trimmed)
    onClose()
    router.push(`/marketplace?search=${encodeURIComponent(trimmed)}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => (options.length ? (i + 1) % options.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  let optionIndex = -1

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-900/40 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed z-50 inset-0 sm:inset-x-0 sm:top-[9vh] sm:bottom-auto sm:mx-auto sm:w-[calc(100%-2rem)] sm:max-w-2xl flex flex-col bg-white sm:rounded-2xl sm:border sm:border-sand-200 shadow-card-lg outline-none sm:max-h-[78vh] sm:animate-dialog-in"
        >
          <Dialog.Title className="sr-only">Search products and shops</Dialog.Title>

          <div className="flex items-center gap-2 px-4 border-b border-sand-200 flex-shrink-0">
            <Search className="w-5 h-5 text-sand-600 flex-shrink-0" aria-hidden="true" />
            <input
              autoFocus
              type="search"
              role="combobox"
              aria-expanded={options.length > 0}
              aria-controls="search-results"
              aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
              aria-autocomplete="list"
              aria-label="Search products and shops"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Search products and shops"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 min-w-0 h-14 bg-transparent text-base text-sand-900 placeholder:text-sand-600 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-medium text-sand-600 hover:text-sand-900 px-2 min-h-[44px]"
              >
                Clear
              </button>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close search"
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 hover:text-sand-900 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div ref={listRef} id="search-results" role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto overscroll-contain py-2">
            {groups.map(group => (
              <div key={group.title || 'all'} role="group" aria-label={group.title || undefined} className="py-1">
                {group.title && (
                  <div className="flex items-center justify-between px-4 pt-2 pb-1">
                    <p className="text-xs font-medium text-sand-600">{group.title}</p>
                    {group.title === 'Recent searches' && (
                      <button type="button" onClick={recentSearches.clear} className="text-xs text-sand-600 hover:text-sand-900 underline underline-offset-2">
                        Clear
                      </button>
                    )}
                  </div>
                )}
                {group.options.map(option => {
                  optionIndex += 1
                  const i = optionIndex
                  return (
                    <div
                      key={option.id}
                      id={`search-option-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      aria-label={option.label}
                      onClick={() => go(option)}
                      onMouseMove={() => { if (active !== i) setActive(i) }}
                      className={cn(
                        'flex items-center gap-3 mx-2 px-2 min-h-[48px] py-1.5 rounded-lg cursor-pointer',
                        i === active && 'bg-sand-100',
                      )}
                    >
                      {option.node}
                    </div>
                  )
                })}
              </div>
            ))}

            {nothingFound && (
              <div className="px-4 py-8">
                <p className="text-base font-bold text-sand-900">Nothing matches &ldquo;{trimmed}&rdquo;</p>
                <p className="mt-1 text-sm text-sand-600">Check the spelling, try one word, or browse a category.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {index?.categories.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => { onClose(); router.push(`/marketplace?category=${c.key}`) }}
                      className="category-pill"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!index && !failed && (
              <div className="px-4 py-3 space-y-3" role="status" aria-label="Loading search">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-11 h-11 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-1/2" />
                      <div className="skeleton h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!index && failed && (
              <div className="px-4 py-8">
                <p className="text-sm text-sand-800">Search couldn&rsquo;t load. Check your connection.</p>
                <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-3">Try again</button>
              </div>
            )}
          </div>

          <p className="sr-only" role="status">
            {trimmed && results
              ? `${results.products.length} products and ${results.shops.length} shops found`
              : ''}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
