'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, UserRound, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import type { User } from '@/types'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional().or(z.literal('')),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine(v => v.password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export default function AccountSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/buyer/settings')
        return
      }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
      if (data) {
        setProfile(data as User)
        profileForm.reset({ full_name: data.full_name ?? '', phone: data.phone ?? '' })
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveProfile(values: ProfileValues) {
    if (!profile) return
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ full_name: values.full_name, phone: values.phone || null })
      .eq('id', profile.id)

    if (error) {
      toast.error('Could not save your details, please try again')
      return
    }
    toast.success('Profile updated')
    router.refresh()
  }

  async function savePassword(values: PasswordValues) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      toast.error(error.message)
      return
    }
    passwordForm.reset({ password: '', confirm_password: '' })
    toast.success('Password changed')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <main className="container-app py-8 max-w-2xl">
        <Link
          href="/buyer/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-sand-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-sand-900 mb-1">Account settings</h1>
        <p className="text-sm text-sand-600 mb-8">
          Signed in as <span className="font-medium text-sand-700">{profile?.email}</span>
        </p>

        {/* Profile */}
        <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card mb-6">
          <h2 className="text-base font-display font-semibold text-sand-900 mb-4 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-green-600" /> Your details
          </h2>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4" noValidate>
            <div>
              <label className="form-label" htmlFor="full_name">Full name</label>
              <input id="full_name" {...profileForm.register('full_name')} className="form-input" />
              {profileForm.formState.errors.full_name && (
                <p className="form-error">{profileForm.formState.errors.full_name.message}</p>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="phone">
                Phone number <span className="text-sand-600 font-normal">(optional)</span>
              </label>
              <input id="phone" type="tel" {...profileForm.register('phone')} className="form-input" placeholder="+233 XX XXX XXXX" />
            </div>
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {profileForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save details
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
          <h2 className="text-base font-display font-semibold text-sand-900 mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-green-600" /> Change password
          </h2>
          <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4" noValidate>
            <div>
              <label className="form-label" htmlFor="password">New password</label>
              <input id="password" type="password" autoComplete="new-password" {...passwordForm.register('password')} className="form-input" placeholder="At least 8 characters" />
              {passwordForm.formState.errors.password && (
                <p className="form-error">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="confirm_password">Confirm new password</label>
              <input id="confirm_password" type="password" autoComplete="new-password" {...passwordForm.register('confirm_password')} className="form-input" />
              {passwordForm.formState.errors.confirm_password && (
                <p className="form-error">{passwordForm.formState.errors.confirm_password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-sand-200 text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50 transition-colors disabled:opacity-60"
            >
              {passwordForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Update password
            </button>
            <p className="text-xs text-sand-600">
              Signed in with Google? You can set a password here to also sign in by email.
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
