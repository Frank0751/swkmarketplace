import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Wallet,
  ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

async function getPendingCounts() {
  try {
    const supabase = await createClient()
    const [{ count: pendingVendors }, { count: pendingListings }] = await Promise.all([
      supabase
        .from('vendor_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
    ])
    return { pendingVendors: pendingVendors ?? 0, pendingListings: pendingListings ?? 0 }
  } catch {
    return { pendingVendors: 0, pendingListings: 0 }
  }
}

export async function AdminLayout({ children, title }: AdminLayoutProps) {
  const { pendingVendors, pendingListings } = await getPendingCounts()

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { href: '/admin/vendors',   label: 'Vendors',   icon: Store,           badge: pendingVendors },
    { href: '/admin/listings',  label: 'Listings',  icon: Package,         badge: pendingListings },
    { href: '/admin/orders',    label: 'Orders',    icon: ShoppingCart,    badge: 0 },
    { href: '/admin/payouts',   label: 'Payouts',   icon: Wallet,          badge: 0 },
  ]

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-64px)] bg-white border-r border-sand-200 sticky top-16">
          <div className="p-5 border-b border-sand-200">
            <div className="text-xs font-semibold text-sand-400 uppercase tracking-widest mb-1">
              SWK Ghana
            </div>
            <div className="text-base font-display font-bold text-sand-900">
              Admin Panel
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-50 hover:text-sand-900 transition-colors group"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-sand-400 group-hover:text-green-600 transition-colors" />
                  {label}
                </span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold bg-green-600 text-white rounded-full">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            ))}

            <div className="pt-3 mt-3 border-t border-sand-200">
              <Link
                href="/"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-sand-500 hover:bg-sand-50 hover:text-sand-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to marketplace
              </Link>
            </div>
          </nav>

          <div className="p-4 border-t border-sand-200">
            <div className="text-xs text-sand-400 text-center">
              SWK Ghana Admin v1.0
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold text-sand-900">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
