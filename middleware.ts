import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Only role-gated areas require auth; everything else (storefront, auth pages,
  // legal pages, unknown URLs → 404) is public. API routes perform their own
  // auth and must return JSON errors, not redirects.
  const isProtected = (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/vendor/dashboard') ||
    pathname.startsWith('/vendor/listings') ||
    pathname.startsWith('/vendor/apply')
  )
  if (!isProtected) return supabaseResponse

  // Auth required
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Fetch role
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Vendor-only routes
  if (
    pathname.startsWith('/vendor/dashboard') ||
    pathname.startsWith('/vendor/listings') ||
    pathname.startsWith('/vendor/apply')
  ) {
    if (role !== 'vendor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/buyer/dashboard', request.url))
    }
    if (role === 'vendor' && profile?.status === 'suspended') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Buyer routes
  if (pathname.startsWith('/buyer')) {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
