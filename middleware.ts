import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept role-gated routes; everything else passes through
  const isProtected = (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/vendor/dashboard') ||
    pathname.startsWith('/vendor/listings') ||
    pathname.startsWith('/vendor/apply') ||
    pathname.startsWith('/vendor/store')
  )
  if (!isProtected) return NextResponse.next({ request })

  // If Supabase env vars aren't configured yet, let the page handle auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (
      pathname.startsWith('/vendor/dashboard') ||
      pathname.startsWith('/vendor/listings') ||
      pathname.startsWith('/vendor/apply') ||
      pathname.startsWith('/vendor/store')
    ) {
      if (role !== 'vendor' && role !== 'admin') {
        return NextResponse.redirect(new URL('/buyer/dashboard', request.url))
      }
      if (role === 'vendor' && profile?.status === 'suspended') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

  } catch (err) {
    console.error('[Middleware] Error:', err)
    // On any unexpected error, redirect to login rather than crashing
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
