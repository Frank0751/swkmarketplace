'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // The recovery link signs the user in with a temporary session. If there is
  // no session, the link is invalid or expired.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      setServerError(error.message)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-2">
          Password updated
        </h2>
        <p className="text-sm text-sand-500 mb-6">
          Your password has been changed. Redirecting you to sign in…
        </p>
        <Link
          href="/login"
          className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  if (hasSession === false) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-2">
          Link expired or invalid
        </h2>
        <p className="text-sm text-sand-500 mb-6">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline transition-colors"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-sand-900 mb-1">
          Set a new password
        </h1>
        <p className="text-sm text-sand-500">
          Choose a strong password for your SWK account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="form-label">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="form-input pl-9"
              placeholder="At least 8 characters"
              {...register('password')}
            />
          </div>
          {errors.password && <p className="form-error">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirm_password" className="form-label">
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              className="form-input pl-9"
              placeholder="Repeat your new password"
              {...register('confirm_password')}
            />
          </div>
          {errors.confirm_password && (
            <p className="form-error">{errors.confirm_password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || hasSession === null}
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
