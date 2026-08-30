'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShoppingBag, Store, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { GoogleButton, AuthDivider } from '@/components/auth/GoogleButton'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    full_name:        z.string().min(2, 'Full name must be at least 2 characters'),
    email:            z.string().email('Please enter a valid email address'),
    phone:            z.string().optional(),
    role:             z.enum(['buyer', 'vendor']),
    password:         z.string().min(8, 'Must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine(v => v.password === v.confirm_password, {
    message: 'Passwords do not match',
    path:    ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'buyer',  Icon: ShoppingBag, label: 'Shop', hint: 'Browse & buy' },
  { value: 'vendor', Icon: Store,       label: 'Sell', hint: 'Apply as a vendor' },
] as const

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Medium', color: 'bg-gold-400' }
  return           { score, label: 'Strong', color: 'bg-green-500' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignupForm() {
  const router = useRouter()
  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError,         setServerError]         = useState<string | null>(null)
  const [confirmEmailSentTo,  setConfirmEmailSentTo]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver:     zodResolver(schema),
    defaultValues: { role: 'buyer' },
  })

  const selectedRole = watch('role')
  const password     = watch('password') ?? ''
  const strength     = useMemo(() => getStrength(password), [password])

  async function onSubmit(data: FormValues) {
    setServerError(null)
    const supabase = createClient()

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    data.email,
      password: data.password,
      options:  {
        data: {
          full_name: data.full_name,
          role:      data.role,
        },
      },
    })

    if (authError) {
      setServerError(authError.message)
      toast.error(authError.message)
      return
    }

    if (!authData.user) {
      setServerError('Something went wrong. Please try again.')
      return
    }

    // If email confirmation is required, Supabase returns a user but no session.
    // There's no session to insert the profile row or reach a protected route with,
    // so stop here and tell the user to confirm their email instead of pretending
    // signup finished.
    if (!authData.session) {
      setConfirmEmailSentTo(data.email)
      return
    }

    // 2. Insert into users table
    const { error: profileError } = await supabase.from('users').insert({
      id:        authData.user.id,
      email:     data.email,
      full_name: data.full_name,
      role:      data.role,
      phone:     data.phone || null,
    })

    if (profileError) {
      // Not fatal, the trigger may have already created the row
      console.warn('Profile insert warning:', profileError.message)
    }

    // 3. Redirect
    if (data.role === 'vendor') {
      toast.success('Account created! Complete your vendor application to start selling.')
      router.push('/vendor/apply')
    } else {
      toast.success('Welcome to SWK Marketplace!')
      router.push('/buyer/dashboard')
    }
    router.refresh()
  }

  if (confirmEmailSentTo) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold text-sand-900 mb-1">
          Check your inbox
        </h2>
        <p className="text-sm text-sand-600 max-w-xs mx-auto">
          We sent a confirmation link to <span className="font-medium text-sand-700">{confirmEmailSentTo}</span>.
          Click it to activate your account, then sign in.
        </p>
      </div>
    )
  }

  return (
    <div>
      <GoogleButton label="Sign up with Google" />
      <p className="mt-2 text-center text-xs text-sand-600">
        Google accounts join as buyers. Want to sell? You can apply as a vendor right after.
      </p>
      <AuthDivider />

    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Full name */}
      <div>
        <label htmlFor="full_name" className="form-label">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          placeholder="Kwame Mensah"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? 'full_name-error' : undefined}
          className={cn('form-input', errors.full_name && 'border-red-400 focus:ring-red-400/20')}
          {...register('full_name')}
        />
        {errors.full_name && (
          <p id="full_name-error" role="alert" className="form-error">{errors.full_name.message}</p>
        )}
      </div>

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
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={cn('form-input', errors.email && 'border-red-400 focus:ring-red-400/20')}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="form-error">{errors.email.message}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className="form-label">
          Phone number{' '}
          <span className="text-sand-600 font-normal">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+233 XX XXX XXXX"
          className="form-input"
          {...register('phone')}
        />
      </div>

      {/* Role selector */}
      {/* Real radios inside a fieldset: screen readers announce this as a
          required group of two exclusive options, arrow keys move between them,
          and selection no longer depends on colour alone. */}
      <fieldset>
        <legend className="form-label mb-2">I want to&hellip;</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map(({ value, Icon, label, hint }) => {
            const active = selectedRole === value
            return (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  value={value}
                  {...register('role')}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-150',
                    // Focus ring lives on the visual card, driven by the hidden input
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-2',
                    active
                      ? 'border-green-600 bg-green-50 shadow-glow-green'
                      : 'border-sand-200 bg-white hover:border-sand-300 hover:bg-sand-50',
                  )}
                >
                  {/* Tick is the non-colour cue that this option is chosen */}
                  {active && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      active ? 'bg-green-100' : 'bg-sand-100',
                    )}
                  >
                    <Icon
                      className={cn('w-5 h-5', active ? 'text-green-700' : 'text-sand-600')}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="block">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        active ? 'text-green-700' : 'text-sand-700',
                      )}
                    >
                      {label}
                    </span>
                    <span className="block text-xs text-sand-600 mt-0.5 leading-tight">
                      {hint}
                    </span>
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        {/* Always rendered so the choice's consequence is visible before you pick,
            not only after. aria-live announces it when the selection changes. */}
        <p
          aria-live="polite"
          className="mt-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2"
        >
          {selectedRole === 'vendor'
            ? 'Sellers complete a short application after signing up. You can browse and buy straight away, but listing products needs SWK Ghana approval first.'
            : 'Buyers can order right away. You can apply to sell later from your dashboard.'}
        </p>
      </fieldset>

      {/* Password */}
      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : 'password-strength'}
            className={cn(
              'form-input pr-10',
              errors.password && 'border-red-400 focus:ring-red-400/20',
            )}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-600 hover:text-sand-700 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength indicator */}
        {password && (
          <div className="mt-2">
            {/* Bars are decoration; the text below carries the same meaning for
                screen readers and for anyone who can't distinguish the colours. */}
            <div className="flex gap-1 mb-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-sand-200',
                  )}
                />
              ))}
            </div>
            <p id="password-strength" aria-live="polite" className="text-xs text-sand-600">
              Strength:{' '}
              <span className={cn(
                'font-medium',
                strength.label === 'Weak'   && 'text-red-600',
                strength.label === 'Medium' && 'text-gold-600',
                strength.label === 'Strong' && 'text-green-700',
              )}>
                {strength.label}
              </span>
            </p>
          </div>
        )}

        {errors.password && (
          <p id="password-error" role="alert" className="form-error">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="confirm_password" className="form-label">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="confirm_password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            aria-invalid={!!errors.confirm_password}
            aria-describedby={errors.confirm_password ? 'confirm_password-error' : undefined}
            className={cn(
              'form-input pr-10',
              errors.confirm_password && 'border-red-400 focus:ring-red-400/20',
            )}
            {...register('confirm_password')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-600 hover:text-sand-700 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p id="confirm_password-error" role="alert" className="form-error">{errors.confirm_password.message}</p>
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
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </button>
    </form>
    </div>
  )
}
