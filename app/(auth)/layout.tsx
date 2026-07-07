import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 mb-8 group"
      >
        <Image
          src="/images/swk-logo.png"
          alt="SWK: Sustainability with Koomson"
          width={92}
          height={48}
          priority
          className="h-12 w-auto transition-transform group-hover:scale-105"
        />
        <span className="font-display text-xl font-bold text-sand-900 group-hover:text-green-600 transition-colors">
          Marketplace
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
