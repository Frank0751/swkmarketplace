import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CartView } from '@/components/cart/CartView'

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />
      <main id="main" className="container-app py-6 md:py-10 pb-28 md:pb-12">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-sand-900 mb-6">Your cart</h1>
        <CartView />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
