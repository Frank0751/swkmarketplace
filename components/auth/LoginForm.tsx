'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton, AuthDivider } from '@/components/auth/GoogleButton'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_REDIRECTS: Record<string, string> = {
  admin:  '/admin/dashboard',
  vendor: '/vendor/dashboard',
  buyer:  '/buyer/dashboard',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const supabase = createClient()

    // 1. Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })

    if (authError) {
      const msg = authError.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : authError.message
      setServerError(msg)
      toast.error(msg)
      return
    }

    if (!authData.user) {
      setServerError('Something went wrong. Please try again.')
      return
    }

    // 2. Check for ?redirect= param first
    const redirectParam = searchParams.get('redirect')
    if (redirectParam) {
      router.push(redirectParam)
      router.refresh()
      return
    }

    // 3. Fetch role and redirect to correct dashboard
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role        = profile?.role as string | undefined
    const destination = (role && ROLE_REDIRECTS[role]) ?? '/buyer/dashboard'

    toast.success('Welcome back!')
    router.push(destination)
    router.refresh()
  }

  const oauthFailed = searchParams.get('error') === 'oauth'

  return (
    <div>
      <GoogleButton redirect={searchParams.get('redirect')} label="Sign in with Google" />
      {oauthFailed && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Google sign-in did not complete. Please try again, or use your email and password.
        </div>
      )}
      <AuthDivider />

    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="email" className="form-label">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={cn('form-input', errors.email && 'border-red-400 focus:ring-red-400/20')}
          {...register('email')}
        />
        {errors.email && (
          <p className="form-error">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(
              'form-input pr-10',
              errors.password && 'border-red-400 focus:ring-red-400/20',
            )}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="form-error">{errors.password.message}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3',
          'bg-green-600 hover:bg-green-700 active:bg-green-800',
          'text-white font-medium text-sm',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
    </div>
  )
}
