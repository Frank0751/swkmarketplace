'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GHANA_REGIONS, VALUE_TAG_META, type ValueTag } from '@/types'
import { PRICE_RANGES, SORT_OPTIONS, marketplaceUrl, type MarketplaceFilters } from '@/lib/marketplace/filters'

/**
 * Sort, region, price and values on a phone or tablet, in a sheet that slides
 * up from the bottom. Choices are applied together when "Show products" is
 * pressed, so the page doesn't reload on every tap.
 */
export function FilterSheet({ filters }: { filters: MarketplaceFilters }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  const activeCount =
    (filters.region ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    filters.values.length

  function onOpenChange(next: boolean) {
    if (next) setDraft(filters)
    setOpen(next)
  }

  function apply() {
    setOpen(false)
    router.push(marketplaceUrl({ ...draft, page: 1 }))
  }

  function toggleValue(tag: ValueTag) {
    setDraft(d => ({
      ...d,
      values: d.values.includes(tag) ? d.values.filter(v => v !== tag) : [...d.values, tag],
    }))
  }

  const sortOptions = SORT_OPTIONS.filter(o => o.value !== 'relevance' || !!filters.search)
  const draftSort = draft.sort ?? (filters.search ? 'relevance' : 'newest')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button" className="btn btn-secondary btn-sm">
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          Sort and filter
          {activeCount > 0 && (
            <span className="nums min-w-[20px] h-5 px-1.5 rounded-full bg-green-600 text-white text-[11px] font-bold leading-5 text-center">
              {activeCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-900/40 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed z-50 inset-x-0 bottom-0 max-h-[88vh] flex flex-col bg-white rounded-t-2xl shadow-card-lg outline-none animate-sheet-in sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg"
        >
          <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-sand-200 flex-shrink-0">
            <Dialog.Title className="text-base font-bold text-sand-900">Sort and filter</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
            <fieldset>
              <legend className="title-card mb-2">Sort by</legend>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={draftSort === opt.value}
                    onClick={() => setDraft(d => ({ ...d, sort: opt.value }))}
                    className={cn('value-tag', draftSort === opt.value && 'active')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="filter-region" className="title-card block mb-2">Region</label>
              <select
                id="filter-region"
                value={draft.region ?? ''}
                onChange={e => setDraft(d => ({ ...d, region: e.target.value || undefined }))}
                className="form-input"
              >
                <option value="">All regions</option>
                {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <fieldset>
              <legend className="title-card mb-2">Price</legend>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(range => {
                  const on = draft.minPrice === range.min && draft.maxPrice === range.max
                  return (
                    <button
                      key={range.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDraft(d => on
                        ? { ...d, minPrice: undefined, maxPrice: undefined }
                        : { ...d, minPrice: range.min, maxPrice: range.max })}
                      className={cn('value-tag', on && 'active')}
                    >
                      {range.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="title-card mb-2">Made this way</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VALUE_TAG_META) as ValueTag[]).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={draft.values.includes(tag)}
                    onClick={() => toggleValue(tag)}
                    className={cn('value-tag', draft.values.includes(tag) && 'active')}
                  >
                    {VALUE_TAG_META[tag].label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-sand-200 flex-shrink-0">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDraft(d => ({ ...d, region: undefined, minPrice: undefined, maxPrice: undefined, values: [] }))}
            >
              Clear
            </button>
            <button type="button" className="btn btn-primary flex-1" onClick={apply}>
              Show products
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
