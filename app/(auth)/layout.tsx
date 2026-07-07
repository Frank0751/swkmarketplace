import Link from 'next/link'
import { Leaf } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 group"
      >
        <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-md group-hover:bg-green-700 transition-colors">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <span className="font-display text-xl font-semibold text-sand-900 group-hover:text-green-600 transition-colors">
          SWK Marketplace
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-sand-200 shadow-card-lg p-8">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-sm text-sand-400 text-center">
        Protected by SWK Ghana · SDG 12 Verified
      </p>
    </div>
  )
}
