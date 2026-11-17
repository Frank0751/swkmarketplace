import { safeRedirect } from '@/lib/utils'

// Where to send someone after Google sign-in or the sign-up confirmation link.
// It travels in a short-lived cookie rather than as ?next= on the callback
// address, because Supabase matches return addresses exactly:
// http://localhost:3000/auth/callback is on the allowed list, but
// http://localhost:3000/auth/callback?next=/checkout is not, so local sign-ins
// were bounced to the live site. (The live site only worked because Supabase
// trusts every address on its own domain.)

export const AUTH_NEXT_COOKIE = 'swk_auth_next'

// Set while an email sign-up waits for its confirmation link. If the link's
// code then can't be exchanged in this browser, the callback knows it came from
// the confirmation email, so the email is confirmed, rather than from Google.
export const EMAIL_SIGNUP_COOKIE = 'swk_email_signup'

const TEN_MINUTES = 600
// The longest a Supabase confirmation link can stay valid
const ONE_DAY = 86_400

/**
 * Browser: remember (or forget) the page to return to after sign-in. An email
 * sign-up keeps it as long as the confirmation link lasts; anything else, such
 * as Google sign-in, also forgets an earlier email sign-up.
 */
export function rememberAuthNext(path: string | null | undefined, { emailSignup = false } = {}) {
  const next = safeRedirect(path)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const maxAge = emailSignup ? ONE_DAY : TEN_MINUTES
  document.cookie = next
    ? `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
    : `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  document.cookie = emailSignup
    ? `${EMAIL_SIGNUP_COOKIE}=1; Path=/; Max-Age=${ONE_DAY}; SameSite=Lax${secure}`
    : `${EMAIL_SIGNUP_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
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
