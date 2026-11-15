'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, Heart, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { useSaved } from '@/lib/local/lists'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',                label: 'Home',    Icon: Home },
  { href: '/marketplace',     label: 'Shop',    Icon: Store },
  { href: '/saved',           label: 'Saved',   Icon: Heart },
  { href: '/cart',            label: 'Cart',    Icon: ShoppingBag },
  { href: '/buyer/dashboard', label: 'Account', Icon: User },
] as const

/** The phone's bottom bar: the five places a shopper goes */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { count, ready } = useCart()
  const saved = useSaved()

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/') ||
        (href === '/buyer/dashboard' && pathname.startsWith('/buyer'))

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-sand-200 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="h-14 grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href)
          const badge =
            href === '/cart' ? (ready ? count : 0)
            : href === '/saved' ? saved.items.length
            : 0
          const name = badge > 0 ? `${label}, ${badge} ${badge === 1 ? 'item' : 'items'}` : label

          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-label={name}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 flex-1 transition-colors',
                  active ? 'text-green-700' : 'text-sand-600',
                )}
              >
                {/* The current place is marked by a bar, weight and colour, not colour alone */}
                <span
                  aria-hidden="true"
                  className={cn('absolute top-0 h-0.5 w-8 rounded-full bg-green-600 transition-opacity', active ? 'opacity-100' : 'opacity-0')}
                />
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  {badge > 0 && (
                    <span
                      key={badge}
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-green-600 text-white text-[9px] font-bold leading-4 text-center nums animate-pop-in"
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className={cn('text-[11px] leading-none', active ? 'font-bold' : 'font-medium')}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
