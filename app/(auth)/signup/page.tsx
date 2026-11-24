import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignupBody, SignupFromAddress } from '@/components/auth/AuthPages'

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
}

// Static: where to go after signing up is read from the address in the
// browser (components/auth/AuthPages.tsx)
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupBody />}>
      <SignupFromAddress />
    </Suspense>
  )
}
