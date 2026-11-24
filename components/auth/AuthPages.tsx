'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'
import type { LoginNotice } from '@/lib/auth/callback'
import { safeRedirect } from '@/lib/utils'

// The sign-in and sign-up pages are static: the same for everyone and served
// from the cache, so crawlers following "Sign in" links cost nothing. What the
// address says (where to go afterwards, a notice from /auth/callback) is read
// here in the browser. Each page renders its body with nothing set as the
// <Suspense> fallback, so the form is in the HTML before this takes over.

function useAuthParams() {
  const params = useSearchParams()
  return {
    redirect: safeRedirect(params.get('redirect')),
    notice: params.get('error') as LoginNotice | null,
  }
}

/** Keeps ?redirect= on the way between sign-in and sign-up */
function withRedirect(path: string, redirect: string | null) {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path
}

interface LoginBodyProps {
  redirect?: string | null
  notice?: LoginNotice | null
}

export function LoginBody({ redirect = null, notice = null }: LoginBodyProps) {
  return (
    <div>
      {/* Heading */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-sand-900 mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-sand-600">
          {redirect === '/checkout' ? 'Sign in to finish checking out. Your cart is saved.' : 'Sign in to your SWK account'}
        </p>
      </div>

      <LoginForm redirect={redirect} notice={notice} />

      {/* Links */}
      <div className="mt-5 space-y-3 text-center text-sm">
        <p className="text-sand-600">
          Don&apos;t have an account?{' '}
          {/* A buyer sent here from checkout who signs up instead should still
              end up back at checkout */}
          <Link
            href={withRedirect('/signup', redirect)}
            className="text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="block text-sand-600 hover:text-sand-600 hover:underline transition-colors"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  )
}

export function LoginFromAddress() {
  const { redirect, notice } = useAuthParams()
  return <LoginBody redirect={redirect} notice={notice} />
}

export function SignupBody({ redirect = null }: { redirect?: string | null }) {
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
            href={withRedirect('/login', redirect)}
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

export function SignupFromAddress() {
  const { redirect } = useAuthParams()
  return <SignupBody redirect={redirect} />
}
