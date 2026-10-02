import { safeRedirect } from '@/lib/utils'

// Where to send someone after Google sign-in. It travels in a short-lived
// cookie rather than as ?next= on the callback address, because Supabase
// matches return addresses exactly: http://localhost:3000/auth/callback is on
// the allowed list, but http://localhost:3000/auth/callback?next=/checkout is
// not, so local sign-ins were bounced to the live site. (The live site only
// worked because Supabase trusts every address on its own domain.)

export const AUTH_NEXT_COOKIE = 'swk_auth_next'

const TEN_MINUTES = 600

/** Browser: remember (or forget) the page to return to after sign-in */
export function rememberAuthNext(path: string | null | undefined) {
  const next = safeRedirect(path)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = next
    ? `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=${TEN_MINUTES}; SameSite=Lax${secure}`
    : `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

/** Server: the remembered page, if it's a path on this site */
export function readAuthNext(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    return safeRedirect(decodeURIComponent(raw))
  } catch {
    return null
  }
}
