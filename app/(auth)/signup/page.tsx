import type { Metadata } from 'next'
import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Create account',
}

export default function SignupPage() {
  return (
    <div>
      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-sand-900 mb-1">
          Join SWK Marketplace
        </h1>
        <p className="text-sm text-sand-500">
          Create your account to start shopping sustainably
        </p>
      </div>

      <SignupForm />

      {/* Links */}
      <div className="mt-5 space-y-3 text-center text-sm">
        <p className="text-sand-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
        <p className="text-sand-400 text-xs">
          By signing up, you agree to shop sustainably 🌿
        </p>
      </div>
    </div>
  )
}
