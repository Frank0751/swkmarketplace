'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { SearchIndex } from '@/lib/search/rank'
import { SearchDialog } from '@/components/search/SearchDialog'

// One search for the whole site. Anything can open it (the navbar field, the
// home page, "/" or Ctrl+K), and the catalogue is fetched once, the first time
// someone reaches for it.

interface SearchContextValue {
  open: (initialQuery?: string) => void
  /** Start fetching the catalogue, e.g. when the search field is hovered */
  warm: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

const FRESH_FOR_MS = 5 * 60 * 1000

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState('')
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const loadedAt = useRef(0)
  const loading = useRef(false)

  const warm = useCallback(() => {
    if (loading.current || Date.now() - loadedAt.current < FRESH_FOR_MS) return
    loading.current = true
    fetch('/api/search/index')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('search index'))))
      .then((data: SearchIndex) => {
        setIndex(data)
        setFailed(false)
        loadedAt.current = Date.now()
      })
      .catch(() => setFailed(true))
      .finally(() => { loading.current = false })
  }, [])

  const open = useCallback((query = '') => {
    setInitialQuery(query)
    setIsOpen(true)
    warm()
  }, [warm])

  // "/" or Ctrl+K opens search from anywhere, unless someone is typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable
      )
      const shortcut = (e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)
      if (!shortcut) return
      e.preventDefault()
      open()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const value = useMemo(() => ({ open, warm }), [open, warm])

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialQuery={initialQuery}
        index={index}
        failed={failed}
        onRetry={warm}
      />
    </SearchContext.Provider>
  )
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>')
  return ctx
}
