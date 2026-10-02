'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, ShoppingCart, User, Leaf } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { cn } from '@/lib/utils'

// ─── Nav item config ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/',                 label: 'Home',    Icon: Home         },
  { href: '/marketplace',      label: 'Shop',    Icon: ShoppingBag  },
  { href: '/cart',             label: 'Cart',    Icon: ShoppingCart },
  { href: '/buyer/dashboard',  label: 'Account', Icon: User         },
  { href: '/vendor/apply',     label: 'Sell',    Icon: Leaf         },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const pathname = usePathname()
  const { count, ready } = useCart()

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        // Visibility, only show on mobile
        'fixed bottom-0 inset-x-0 z-40 md:hidden',
        // Appearance
        'h-14 bg-white border-t border-sand-200 shadow-card-lg',
        // Safe area support for notched phones
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
    >
      <ul className="h-full grid grid-cols-5 divide-x divide-sand-100">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href)
          const showCount = href === '/cart' && ready && count > 0
          const name = showCount ? `${label}, ${count} ${count === 1 ? 'item' : 'items'}` : label

          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-label={name}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors"
              >
                {/* Icon */}
                <span className="relative">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      active ? 'text-green-600' : 'text-sand-600',
                    )}
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden="true"
                  />
                  {showCount && (
                    <span
                      key={count}
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-green-600 text-white text-[9px] font-bold leading-4 text-center tabular-nums animate-pop-in"
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none transition-colors',
                    active ? 'text-green-600' : 'text-sand-600',
                  )}
                >
                  {label}
                </span>

                {/* Active indicator dot */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-1 h-1 rounded-full transition-all duration-200',
                    active ? 'bg-green-600 opacity-100' : 'opacity-0',
                  )}
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
