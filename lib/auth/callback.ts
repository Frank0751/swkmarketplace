import { safeRedirect } from '@/lib/utils'

// The decisions behind /auth/callback, the landing point for Google sign-in
// and for the confirmation link in the sign-up email. Kept free of Supabase and
// Next so they can be tested on their own.

/** Why the callback sent someone to /login: the ?error= value LoginForm reads */
export type LoginNotice =
  | 'oauth'            // Google sign-in did not complete
  | 'email_confirmed'  // their email is confirmed, but this browser can't sign them in
  | 'link_expired'     // the emailed link had expired or was already used

export type SignupRole = 'buyer' | 'vendor'

/**
 * The role someone picked on the sign-up form, from their user metadata. Same
 * rule as handle_new_user() in migration 004: buyer or vendor, and anything
 * else (or nothing, as with Google) is a buyer.
 */
export function signupRole(metadata: unknown): SignupRole {
  const role = (metadata as { role?: unknown } | null | undefined)?.role
  return role === 'vendor' ? 'vendor' : 'buyer'
}

/**
 * Where a new account goes first: sellers to their application, buyers back to
 * the page they were on (checkout with a saved cart, say) or their dashboard.
 */
export function firstStopAfterSignup(role: SignupRole, redirect: string | null | undefined): string {
  if (role === 'vendor') return '/vendor/apply'
  return safeRedirect(redirect) ?? '/buyer/dashboard'
}

/**
 * Supabase sends people back without a code when an emailed link has expired
 * or was already used. Anything else is a Google sign-in that was cancelled or
 * refused.
 */
export function missingCodeNotice(errorCode: string | null): LoginNotice {
  return errorCode === 'otp_expired' ? 'link_expired' : 'oauth'
}

/**
 * A code came back but couldn't be exchanged for a session. For a confirmation
 * link the email is confirmed regardless: Supabase confirms it before sending
 * the person here. The exchange fails when the link opens in a browser other
 * than the one that signed up (no code verifier, which only an emailed link can
 * cause), when it opens after Supabase's sign-in state has lapsed (five minutes
 * by default), or after a second sign-up in this browser replaced the verifier.
 * For the last two, the email sign-up cookie says the code came from the
 * confirmation link rather than from Google.
 */
export function failedCodeNotice(errorCode: string | undefined, startedEmailSignup: boolean): LoginNotice {
  if (errorCode === 'pkce_code_verifier_not_found' || startedEmailSignup) return 'email_confirmed'
  return 'oauth'
}

/** The sign-in page with a notice, still headed for the page they wanted */
export function loginPath(notice: LoginNotice, next: string | null): string {
  const params = new URLSearchParams({ error: notice })
  if (next) params.set('redirect', next)
  return `/login?${params}`
}
