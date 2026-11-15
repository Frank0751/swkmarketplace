'use client'

import { useSyncExternalStore } from 'react'

// Small lists kept in this browser (saved items, recently viewed, recent
// searches). Like the cart, they need no account and survive a refresh.
// Every component reading a list re-renders when it changes, in this tab or
// another one.

export interface LocalList<T> {
  get: () => T[]
  set: (next: T[]) => void
  subscribe: (listener: () => void) => () => void
}

const EMPTY: never[] = []

export function createLocalList<T>(key: string, max: number): LocalList<T> {
  let cache: T[] | null = null
  const listeners = new Set<() => void>()

  function read(): T[] {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return EMPTY
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as T[]).slice(0, max) : EMPTY
    } catch {
      return EMPTY
    }
  }

  function get(): T[] {
    if (cache === null) cache = read()
    return cache
  }

  function emit() {
    listeners.forEach(listener => listener())
  }

  function set(next: T[]) {
    cache = next.slice(0, max)
    try {
      window.localStorage.setItem(key, JSON.stringify(cache))
    } catch {
      // Private mode or storage full: the list still works for this page
    }
    emit()
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== key) return
    cache = read()
    emit()
  }

  function subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener('storage', onStorage)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  }

  return { get, set, subscribe }
}

const serverSnapshot = () => EMPTY

/** The list's items. Empty on the server and on first paint, then the saved list. */
export function useLocalList<T>(list: LocalList<T>): T[] {
  return useSyncExternalStore(list.subscribe, list.get, serverSnapshot as () => T[])
}
