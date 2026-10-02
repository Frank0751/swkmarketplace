import type { Metadata } from 'next'
import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'
import { safeRedirect } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Create account',
}

export default function SignupPage({ searchParams }: { searchParams: { redirect?: string } }) {
  const redirect = safeRedirect(searchParams.redirect)
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  return (
    <div>
      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-sand-900 mb-1">
          Join SWK Marketplace
        </h1>
        <p className="text-sm text-sand-600">
          {redirect === '/checkout'
            ? 'Create your account to finish checking out. Your cart is saved.'
            : 'Create your account to start shopping sustainably'}
        </p>
      </div>

      <SignupForm redirect={redirect} />

      {/* Links */}
      <div className="mt-5 space-y-3 text-center text-sm">
        <p className="text-sand-600">
          Already have an account?{' '}
          <Link
            href={loginHref}
            className="text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
        <p className="text-sand-600 text-xs">
          By signing up, you agree to shop sustainably.
        </p>
      </div>
    </div>
  )
}
