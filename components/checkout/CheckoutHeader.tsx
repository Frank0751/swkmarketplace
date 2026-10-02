import Image from 'next/image'
import Link from 'next/link'
import { Lock } from 'lucide-react'

/**
 * A quiet header for checkout and its confirmation: the logo and a reassurance,
 * without the shop navigation that pulls buyers away mid-payment.
 */
export function CheckoutHeader() {
  return (
    <header className="bg-white border-b border-sand-200">
      <div className="container-app max-w-6xl flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">
          <Image src="/images/swk-logo.png" alt="SWK Marketplace home" width={77} height={40} priority className="h-9 w-auto" />
          <span className="hidden sm:block text-sm font-display font-bold text-sand-900">Marketplace</span>
        </Link>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-sand-700">
          <Lock className="w-4 h-4 text-green-600" aria-hidden="true" />
          Secure checkout
        </p>
      </div>
    </header>
  )
}
