import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <div>
      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-sand-900 mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-sand-500">Sign in to your SWK account</p>
      </div>

      {/* useSearchParams (redirect param) requires a Suspense boundary for prerender */}
      <Suspense>
        <LoginForm />
      </Suspense>

      {/* Links */}
      <div className="mt-5 space-y-3 text-center text-sm">
        <p className="text-sand-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="block text-sand-400 hover:text-sand-600 hover:underline transition-colors"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}
