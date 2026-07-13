'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShoppingBag, Store } from 'lucide-react'
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

    // 2. Insert into users table
    const { error: profileError } = await supabase.from('users').insert({
      id:        authData.user.id,
      email:     data.email,
      full_name: data.full_name,
      role:      data.role,
      phone:     data.phone || null,
    })

    if (profileError) {
      // Not fatal, the trigger may have already created the row, or email confirmation is pending
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

  return (
    <div>
      <GoogleButton label="Sign up with Google" />
      <p className="mt-2 text-center text-xs text-sand-400">
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
          className={cn('form-input', errors.full_name && 'border-red-400 focus:ring-red-400/20')}
          {...register('full_name')}
        />
        {errors.full_name && (
          <p className="form-error">{errors.full_name.message}</p>
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
          className={cn('form-input', errors.email && 'border-red-400 focus:ring-red-400/20')}
          {...register('email')}
        />
        {errors.email && (
          <p className="form-error">{errors.email.message}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className="form-label">
          Phone number{' '}
          <span className="text-sand-400 font-normal">(optional)</span>
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
      <div>
        <p className="form-label mb-2">I want to…</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Buyer */}
          <button
            type="button"
            onClick={() => setValue('role', 'buyer', { shouldValidate: true })}
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-150 focus:outline-none',
              selectedRole === 'buyer'
                ? 'border-green-600 bg-green-50 shadow-glow-green'
                : 'border-sand-200 bg-white hover:border-sand-300 hover:bg-sand-50',
            )}
          >
            {selectedRole === 'buyer' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-600" />
            )}
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              selectedRole === 'buyer' ? 'bg-green-100' : 'bg-sand-100',
            )}>
              <ShoppingBag className={cn(
                'w-5 h-5',
                selectedRole === 'buyer' ? 'text-green-600' : 'text-sand-400',
              )} />
            </div>
            <div>
              <p className={cn(
                'text-sm font-semibold',
                selectedRole === 'buyer' ? 'text-green-700' : 'text-sand-700',
              )}>
                Shop
              </p>
              <p className="text-xs text-sand-400 mt-0.5 leading-tight">
                Browse &amp; buy
              </p>
            </div>
          </button>

          {/* Vendor */}
          <button
            type="button"
            onClick={() => setValue('role', 'vendor', { shouldValidate: true })}
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-150 focus:outline-none',
              selectedRole === 'vendor'
                ? 'border-green-600 bg-green-50 shadow-glow-green'
                : 'border-sand-200 bg-white hover:border-sand-300 hover:bg-sand-50',
            )}
          >
            {selectedRole === 'vendor' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-600" />
            )}
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              selectedRole === 'vendor' ? 'bg-green-100' : 'bg-sand-100',
            )}>
              <Store className={cn(
                'w-5 h-5',
                selectedRole === 'vendor' ? 'text-green-600' : 'text-sand-400',
              )} />
            </div>
            <div>
              <p className={cn(
                'text-sm font-semibold',
                selectedRole === 'vendor' ? 'text-green-700' : 'text-sand-700',
              )}>
                Sell
              </p>
              <p className="text-xs text-sand-400 mt-0.5 leading-tight">
                Verified green seller
              </p>
            </div>
          </button>
        </div>
        {selectedRole === 'vendor' && (
          <p className="mt-2 text-xs text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            You&apos;ll complete a short application after signing up to become a verified green entrepreneur.
          </p>
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
            autoComplete="new-password"
            placeholder="Min. 8 characters"
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

        {/* Strength indicator */}
        {password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
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
            <p className="text-xs text-sand-400">
              Strength:{' '}
              <span className={cn(
                'font-medium',
                strength.label === 'Weak'   && 'text-red-500',
                strength.label === 'Medium' && 'text-gold-500',
                strength.label === 'Strong' && 'text-green-600',
              )}>
                {strength.label}
              </span>
            </p>
          </div>
        )}

        {errors.password && (
          <p className="form-error">{errors.password.message}</p>
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
            className={cn(
              'form-input pr-10',
              errors.confirm_password && 'border-red-400 focus:ring-red-400/20',
            )}
            {...register('confirm_password')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 transition-colors focus:outline-none"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="form-error">{errors.confirm_password.message}</p>
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
