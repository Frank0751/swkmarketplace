'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, ShoppingBag, User, ChevronDown, Settings, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as UserType } from '@/types'
import { clsx } from 'clsx'

export function Navbar() {
  const [user, setUser]             = useState<UserType | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

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
    window.addEventListener('scroll', onScroll)
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

  return (
    <>
      <nav className={clsx(
        'sticky top-0 z-40 w-full transition-all duration-200',
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-card border-b border-sand-200' : 'bg-white border-b border-sand-200'
      )}>
        <div className="container-app">
          <div className="flex items-center h-16 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <Image
                src="/images/swk-logo.png"
                alt="SWK: Sustainability with Koomson"
                width={77}
                height={40}
                priority
                className="h-10 w-auto transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block">
                <div className="text-sm font-display font-bold text-sand-900 leading-tight">Marketplace</div>
                <div className="text-[10px] font-medium text-green-600 leading-tight tracking-wide uppercase">by SWK Ghana</div>
              </div>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1 ml-4">
              {[
                { href: '/marketplace',   label: 'Shop' },
                { href: '/how-it-works',  label: 'How it works' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-green-50 text-green-700'
                      : 'text-sand-600 hover:text-sand-900 hover:bg-sand-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* Route back to the parent organisation. The marketplace is a
                  programme of SWK Ghana, and without this the only way back was
                  a link buried in the footer. */}
              <a
                href="https://swkghana.org"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-sand-600 hover:text-sand-900 hover:bg-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                About SWK Ghana
                <ExternalLink className="w-3 h-3 text-sand-600" aria-hidden="true" />
                <span className="sr-only">(opens the main SWK Ghana website)</span>
              </a>
            </div>

            {/* Search bar, desktop */}
            <div className="hidden md:flex flex-1 max-w-sm mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-600" />
                <input
                  type="search"
                  aria-label="Search eco-friendly products"
                  placeholder="Search eco-friendly products..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-sand-100 border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:bg-white transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`
                    }
                  }}
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Mobile search toggle */}
              <button
                className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                onClick={() => setSearchOpen(o => !o)}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {user ? (
                /* Click-driven disclosure. This was hover-only with
                   `invisible group-hover:visible`, which removed every item
                   (including Sign out) from the tab order and left touch users
                   with no way to open it at all. */
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    onClick={() => setAccountOpen(o => !o)}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold flex-shrink-0">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block max-w-24 truncate">{user.full_name?.split(' ')[0]}</span>
                    <ChevronDown
                      className={clsx(
                        'w-3.5 h-3.5 text-sand-600 hidden sm:block transition-transform',
                        accountOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                    <span className="sr-only">Account menu</span>
                  </button>

                  {/* Dropdown */}
                  {accountOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-card-lg border border-sand-200 py-1 z-50">
                      <div className="px-3 py-2 border-b border-sand-100">
                        <div className="text-xs font-medium text-sand-900 truncate">{user.full_name}</div>
                        <div className="text-xs text-sand-600 truncate">{user.email}</div>
                      </div>
                      <Link href={getDashboardLink()} onClick={() => setAccountOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 transition-colors">
                        <User className="w-4 h-4" aria-hidden="true" /> Dashboard
                      </Link>
                      <Link href="/buyer/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 transition-colors">
                        <Settings className="w-4 h-4" aria-hidden="true" /> Account settings
                      </Link>
                      {user.role === 'vendor' && (
                        <Link href="/vendor/listings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 transition-colors">
                          <ShoppingBag className="w-4 h-4" aria-hidden="true" /> My Listings
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:block px-3 py-2 text-sm font-medium text-sand-700 hover:text-sand-900 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden border-t border-sand-200 px-4 py-3 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-600" />
              <input
                autoFocus
                type="search"
                  aria-label="Search eco-friendly products"
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-sand-100 border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:bg-white"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-sand-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {[
                { href: '/marketplace',   label: 'Shop all products' },
                { href: '/how-it-works',  label: 'How it works' },
                { href: '/vendor/apply',  label: 'Become a vendor' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* The desktop nav is hidden on mobile, so without this entry a
                  phone user has no route back to the main site at all. */}
              <a
                href="https://swkghana.org"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
              >
                About SWK Ghana
                <ExternalLink className="w-3.5 h-3.5 text-sand-600" aria-hidden="true" />
                <span className="sr-only">(opens the main SWK Ghana website)</span>
              </a>
              {user ? (
                /* Signed-in users previously had nothing here, and the desktop
                   account menu is hover-only on touch, so there was no way to
                   reach a dashboard or sign out from a phone at all. */
                <div className="pt-2 mt-2 border-t border-sand-100 space-y-1">
                  <div className="px-3 pb-1">
                    <div className="text-xs font-medium text-sand-900 truncate">{user.full_name}</div>
                    <div className="text-xs text-sand-600 truncate">{user.email}</div>
                  </div>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" aria-hidden="true" /> Dashboard
                  </Link>
                  <Link
                    href="/buyer/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" /> Account settings
                  </Link>
                  {user.role === 'vendor' && (
                    <Link
                      href="/vendor/listings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-sand-700 hover:bg-sand-50 rounded-lg transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" /> My Listings
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-sand-100 flex gap-2">
                  <Link href="/login" className="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium text-sand-700 border border-sand-200 rounded-lg hover:bg-sand-50">
                    Log in
                  </Link>
                  <Link href="/signup" className="flex-1 min-h-[44px] flex items-center justify-center text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
