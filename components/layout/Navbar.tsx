'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, ChevronDown, ExternalLink, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CartButton } from '@/components/cart/CartButton'
import { useSearch } from '@/components/search/SearchProvider'
import { useSaved } from '@/lib/local/lists'
import type { User as UserType } from '@/types'
import { clsx } from 'clsx'

const NAV_LINKS = [
  { href: '/marketplace',  label: 'Products' },
  { href: '/shops',        label: 'Shops' },
  { href: '/how-it-works', label: 'How it works' },
]

export function Navbar() {
  const [user, setUser]               = useState<UserType | null>(null)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const search = useSearch()
  const saved = useSaved()

  // Close the account menu on Escape or a click outside it
  useEffect(() => {
    if (!accountOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    const onPointer = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [accountOpen])

  // Route changes should never leave a menu hanging open
  useEffect(() => {
    setAccountOpen(false)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('users').select('*').eq('id', data.user.id).single()
          .then(({ data: profile }) => setUser(profile))
      }
    })

    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  const getDashboardLink = () => {
    if (!user) return '/login'
    if (user.role === 'admin') return '/admin/dashboard'
    if (user.role === 'vendor') return '/vendor/dashboard'
    return '/buyer/dashboard'
  }

  const accountLinks = [
    { href: getDashboardLink(), label: 'Dashboard' },
    { href: '/buyer/orders', label: 'My orders' },
    { href: '/saved', label: 'Saved items' },
    { href: '/buyer/payment-methods', label: 'Payment methods' },
    { href: '/buyer/settings', label: 'Account settings' },
    ...(user?.role === 'vendor' ? [{ href: '/vendor/listings', label: 'My listings' }] : []),
  ]

  const savedLabel = saved.items.length === 0
    ? 'Saved items'
    : `Saved items, ${saved.items.length}`

  return (
    <nav
      aria-label="Main"
      className={clsx(
        'sticky top-0 z-40 w-full bg-white border-b border-sand-200 transition-shadow duration-200',
        scrolled && 'shadow-card-md',
      )}
    >
      <div className="container-app">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image
              src="/images/swk-logo.png"
              alt="SWK: Sustainability with Koomson"
              width={77}
              height={40}
              priority
              className="h-10 w-auto"
            />
            <span className="hidden sm:block leading-tight">
              <span className="block text-sm font-bold text-sand-900">Marketplace</span>
              <span className="block text-[11px] font-medium text-green-700">by SWK Ghana</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 ml-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'text-green-800 bg-green-50'
                    : 'text-sand-700 hover:text-sand-900 hover:bg-sand-100',
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Route back to the parent organisation: the marketplace is a
                programme of SWK Ghana */}
            <a
              href="https://swkghana.org"
              className="hidden xl:inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-sand-700 hover:text-sand-900 hover:bg-sand-100 transition-colors"
            >
              About SWK Ghana
              <ExternalLink className="w-3 h-3 text-sand-600" aria-hidden="true" />
              <span className="sr-only">(opens the main SWK Ghana website)</span>
            </a>
          </div>

          {/* Search, desktop: looks like a field, opens the search window */}
          <button
            type="button"
            onClick={() => search.open()}
            onMouseEnter={search.warm}
            onFocus={search.warm}
            className="hidden md:flex flex-1 max-w-md mx-2 items-center gap-2.5 h-10 px-3.5 rounded-lg bg-sand-100 border border-sand-200 text-sm text-sand-600 text-left hover:border-sand-300 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Search products and shops
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-sand-700 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              onClick={() => search.open()}
              aria-label="Search products and shops"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>

            <Link
              href="/saved"
              aria-label={savedLabel}
              className="relative hidden sm:flex w-11 h-11 items-center justify-center rounded-lg text-sand-700 hover:bg-sand-100 hover:text-sand-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
              {saved.items.length > 0 && (
                <span aria-hidden="true" className="absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sand-900 text-white text-[10px] font-bold leading-[18px] text-center nums">
                  {saved.items.length > 99 ? '99+' : saved.items.length}
                </span>
              )}
            </Link>

            <CartButton />

            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen(o => !o)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 min-h-[44px] px-2 sm:px-3 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  <span className="w-7 h-7 rounded-full bg-green-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0" aria-hidden="true">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="hidden sm:block max-w-24 truncate">{user.full_name?.split(' ')[0]}</span>
                  <ChevronDown
                    className={clsx('w-3.5 h-3.5 text-sand-600 hidden sm:block transition-transform', accountOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                  <span className="sr-only">Account menu</span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-card-lg border border-sand-200 py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-sand-200">
                      <div className="text-sm font-bold text-sand-900 truncate">{user.full_name}</div>
                      <div className="text-xs text-sand-600 truncate">{user.email}</div>
                    </div>
                    {accountLinks.map(link => (
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2.5 text-sm text-sand-800 hover:bg-sand-100 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 border-t border-sand-200 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-1">
                <Link
                  href="/login"
                  className="hidden sm:flex items-center min-h-[44px] px-3 text-sm font-medium text-sand-700 hover:text-sand-900 transition-colors"
                >
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg text-sand-700 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile and tablet menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-sand-200 bg-white">
          <div className="container-app py-3 space-y-1">
            {[...NAV_LINKS, { href: '/saved', label: 'Saved items' }, { href: '/vendor/apply', label: 'Sell on SWK Marketplace' }].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-sm font-medium text-sand-800 hover:bg-sand-100 rounded-lg transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Without this a phone user has no route back to the main site */}
            <a
              href="https://swkghana.org"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-sand-800 hover:bg-sand-100 rounded-lg transition-colors"
            >
              About SWK Ghana
              <ExternalLink className="w-3.5 h-3.5 text-sand-600" aria-hidden="true" />
              <span className="sr-only">(opens the main SWK Ghana website)</span>
            </a>

            {user ? (
              <div className="pt-2 mt-2 border-t border-sand-200 space-y-1">
                <div className="px-3 pb-1">
                  <div className="text-sm font-bold text-sand-900 truncate">{user.full_name}</div>
                  <div className="text-xs text-sand-600 truncate">{user.email}</div>
                </div>
                {accountLinks.filter(l => l.href !== '/saved').map(link => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm text-sand-800 hover:bg-sand-100 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="pt-3 mt-2 border-t border-sand-200 flex gap-2">
                <Link href="/login" className="btn btn-secondary flex-1">Log in</Link>
                <Link href="/signup" className="btn btn-primary flex-1">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
