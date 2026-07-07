import { createBrowserClient } from '@supabase/ssr'

// Fall back to a placeholder project when env vars are missing so pages render
// with empty data instead of crashing, mirrors the middleware's resilience.
// Queries against the placeholder fail gracefully into empty/error states.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY

  if (url === FALLBACK_URL) {
    console.warn(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set, using a placeholder client; no data will load',
    )
  }

  return createBrowserClient(url, key)
}
