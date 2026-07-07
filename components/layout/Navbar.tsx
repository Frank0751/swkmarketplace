'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, ShoppingBag, User, ChevronDown, Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as UserType } from '@/types'
import { clsx } from 'clsx'

export function Navbar() {
  const [user, setUser]             = useState<UserType | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()

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
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-display font-semibold text-sand-900 leading-tight">SWK</div>
                <div className="text-[10px] font-medium text-green-600 leading-tight tracking-wide uppercase">Marketplace</div>
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
            </div>

            {/* Search bar — desktop */}
            <div className="hidden md:flex flex-1 max-w-sm mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                <input
                  type="search"
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
                className="md:hidden p-2 rounded-lg text-sand-600 hover:bg-sand-100"
                onClick={() => setSearchOpen(o => !o)}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold flex-shrink-0">
                      {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block max-w-24 truncate">{user.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-sand-400 hidden sm:block" />
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-card-lg border border-sand-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                    <div className="px-3 py-2 border-b border-sand-100">
                      <div className="text-xs font-medium text-sand-900 truncate">{user.full_name}</div>
                      <div className="text-xs text-sand-400 truncate">{user.email}</div>
                    </div>
                    <Link href={getDashboardLink()} className="flex items-center gap-2 px-3 py-2 text-sm text-sand-700 hover:bg-sand-50 transition-colors">
                      <User className="w-4 h-4" /> Dashboard
                    </Link>
                    {user.role === 'vendor' && (
                      <Link href="/vendor/listings" className="flex items-center gap-2 px-3 py-2 text-sm text-sand-700 hover:bg-sand-50 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> My Listings
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
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
                className="md:hidden p-2 rounded-lg text-sand-600 hover:bg-sand-100"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
              <input
                autoFocus
                type="search"
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
                { href: '/marketplace',   label: '🛍️  Shop all products' },
                { href: '/how-it-works',  label: '🤝  How it works' },
                { href: '/vendor/apply',  label: '🌿  Become a vendor' },
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
              {!user && (
                <div className="pt-2 border-t border-sand-100 flex gap-2">
                  <Link href="/login" className="flex-1 py-2.5 text-center text-sm font-medium text-sand-700 border border-sand-200 rounded-lg hover:bg-sand-50">
                    Log in
                  </Link>
                  <Link href="/signup" className="flex-1 py-2.5 text-center text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
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
