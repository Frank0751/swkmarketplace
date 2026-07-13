'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface GoogleButtonProps {
  /** Internal path to land on after sign-in, e.g. "/vendor/apply" */
  redirect?: string | null
  label?: string
}

export function GoogleButton({ redirect, label = 'Continue with Google' }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()

    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (redirect && redirect.startsWith('/')) {
      callbackUrl.searchParams.set('next', redirect)
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setLoading(false)
      toast.error('Could not start Google sign-in. Please try again.')
      console.error('[Google sign-in]', error.message)
    }
    // On success the browser navigates to Google, no cleanup needed
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3',
        'bg-white border-2 border-sand-200 text-sand-800 font-medium text-sm',
        'hover:border-sand-300 hover:bg-sand-50 active:scale-[0.99]',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-sand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        /* Official Google "G" mark */
        <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      )}
      {loading ? 'Redirecting to Google…' : label}
    </button>
  )
}

/** "or" divider used between the Google button and the email form */
export function AuthDivider({ text = 'or continue with email' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 my-5" role="separator">
      <div className="h-px flex-1 bg-sand-200" />
      <span className="text-xs text-sand-400 font-medium whitespace-nowrap">{text}</span>
      <div className="h-px flex-1 bg-sand-200" />
    </div>
  )
}
