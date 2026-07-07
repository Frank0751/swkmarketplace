import Link from 'next/link'
import { Leaf, Search, Home } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">
            404 — Page not found
          </p>
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-3">
            This page has gone off the grid
          </h1>
          <p className="text-sand-500 mb-8">
            The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
            Let&rsquo;s get you back to shopping sustainably.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Home className="w-4 h-4" /> Go home
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-white border border-sand-200 text-sand-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-sand-50 transition-colors"
            >
              <Search className="w-4 h-4" /> Browse marketplace
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
