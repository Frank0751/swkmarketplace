'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App error boundary]', error)
  }, [error])

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-gold-50 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-gold-500" />
        </div>
        <h1 className="font-display text-3xl font-bold text-sand-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-sand-500 mb-8">
          An unexpected error occurred. You can try again, or head back home while
          we look into it.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white border border-sand-200 text-sand-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-sand-50 transition-colors"
          >
            <Home className="w-4 h-4" /> Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
