import { createClient } from '@supabase/supabase-js'

// For what any visitor may see: the anon key and no cookies. A page that reads
// cookies() (as lib/supabase/server.ts does) renders afresh for every request,
// so every crawler visit runs a function; one that doesn't can be cached and
// served without running anything. Row level security still applies, so this
// only ever sees approved listings and shops. Never use it for anything that
// belongs to a signed-in user.

// Same fallback as the other clients: pages render empty instead of crashing
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
