import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Fall back to a placeholder project when env vars are missing so pages render
// with empty data instead of crashing — mirrors the middleware's resilience.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

function envOrFallback(url: string | undefined, key: string | undefined): [string, string] {
  if (!url || !key) {
    console.warn('[Supabase] Environment variables are not set — using a placeholder client; no data will load')
    return [FALLBACK_URL, FALLBACK_KEY]
  }
  return [url, key]
}

export async function createClient() {
  const cookieStore = await cookies()
  const [url, key] = envOrFallback(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from Server Component — middleware handles session refresh
        }
      },
    },
  })
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  const [url, key] = envOrFallback(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}
