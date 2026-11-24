import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginBody, LoginFromAddress } from '@/components/auth/AuthPages'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

// Static: where to go after signing in, and any notice from /auth/callback,
// are read from the address in the browser (components/auth/AuthPages.tsx)
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginBody />}>
      <LoginFromAddress />
    </Suspense>
  )
}
