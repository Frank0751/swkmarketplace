import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AUTH_NEXT_COOKIE, EMAIL_SIGNUP_COOKIE, readAuthNext } from '@/lib/auth/next-cookie'
import { failedCodeNotice, loginPath, missingCodeNotice, signupRole } from '@/lib/auth/callback'
import { safeRedirect } from '@/lib/utils'

const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  vendor: '/vendor/dashboard',
  buyer: '/buyer/dashboard',
}

// Landing point for Google sign-in and for the confirmation link in the
// sign-up email. Supabase redirects here with a one-time code; we exchange it
// for a session cookie, make sure the profile row exists, then send the user
// where they were headed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Where they were headed: remembered in a cookie by the Google button and the
  // sign-up form (an older link may still carry ?next=). Only paths on this
  // site, never an outside address.
  const next = safeRedirect(searchParams.get('next')) ?? readAuthNext(request.cookies.get(AUTH_NEXT_COOKIE)?.value)
  const startedEmailSignup = request.cookies.get(EMAIL_SIGNUP_COOKIE)?.value === '1'

  // Both cookies have done their job once the callback has run, whatever the
  // outcome. delete() expires them by date: a Max-Age of 0 is lost when Next
  // merges in the session cookies Supabase sets.
  function goTo(path: string) {
    const response = NextResponse.redirect(`${origin}${path}`)
    response.cookies.delete(AUTH_NEXT_COOKIE)
    response.cookies.delete(EMAIL_SIGNUP_COOKIE)
    return response
  }

  if (!code) {
    return goTo(loginPath(missingCodeNotice(searchParams.get('error_code')), next))
  }

  const supabase = await createClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[Auth callback] Code exchange failed:', exchangeError.message)
    return goTo(loginPath(failedCodeNotice(exchangeError.code, startedEmailSignup), next))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return goTo(loginPath(failedCodeNotice(undefined, startedEmailSignup), next))
  }

  // The on_auth_user_created trigger creates the profile, with the role picked
  // at sign-up; this is a belt-and-braces fallback for projects where migration
  // 004 hasn't run yet, and it follows the same rule
  let { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>
    const role = signupRole(meta)
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'SWK Member',
      avatar_url: meta.avatar_url || meta.picture || null,
      role,
    })
    if (insertError && insertError.code !== '23505') {
      console.error('[Auth callback] Profile insert failed:', insertError.message)
    }
    profile = { role }
  }

  // A new seller's sign-up remembered /vendor/apply, so `next` covers them. With
  // nothing remembered, a seller who hasn't applied yet lands on the dashboard,
  // which sends them to apply.
  return goTo(next ?? ROLE_REDIRECTS[profile.role as string] ?? '/buyer/dashboard')
}
