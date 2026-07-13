import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  vendor: '/vendor/dashboard',
  buyer: '/buyer/dashboard',
}

// OAuth (Google) and magic-link landing point. Supabase redirects here with a
// one-time code; we exchange it for a session cookie, make sure the profile
// row exists, then send the user where they were headed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  // Only allow internal paths, never external redirect targets
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const supabase = await createClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[Auth callback] Code exchange failed:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  // The on_auth_user_created trigger creates the profile; this is a belt-and-braces
  // fallback for projects where migration 004 hasn't run yet
  let { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email ?? '',
      full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'SWK Member',
      avatar_url: meta.avatar_url || meta.picture || null,
      role: 'buyer',
    })
    if (insertError && insertError.code !== '23505') {
      console.error('[Auth callback] Profile insert failed:', insertError.message)
    }
    profile = { role: 'buyer' }
  }

  const destination = next ?? ROLE_REDIRECTS[profile.role as string] ?? '/buyer/dashboard'
  return NextResponse.redirect(`${origin}${destination}`)
}
