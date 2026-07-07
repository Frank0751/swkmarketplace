'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Leaf,
  CheckCircle2,
  ArrowRight,
  Users,
  Recycle,
  BadgeCheck,
  Globe,
  Info,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import { GHANA_REGIONS, CATEGORY_META } from '@/types'
import type { ProductCategory, GhanaRegion } from '@/types'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  business_name:           z.string().min(2, 'Business name must be at least 2 characters'),
  business_description:    z.string().min(100, 'Description must be at least 100 characters'),
  category:                z.enum(['agribusiness', 'recycled_upcycled', 'handmade_crafts', 'organic_produce'], {
    required_error: 'Please select a category',
  }),
  location:                z.string().min(2, 'Please enter your city or town'),
  region:                  z.string().min(1, 'Please select a region'),
  phone:                   z.string().min(9, 'Please enter a valid phone number'),
  sustainability_statement: z.string().min(50, 'Please describe how your business supports SDG 12 (min 50 characters)'),
  instagram:               z.string().optional(),
  facebook:                z.string().optional(),
  website:                 z.string().url('Please enter a valid URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

// ─── Requirements sidebar ────────────────────────────────────────────────────

const REQUIREMENTS = [
  { icon: Users,      text: 'Business owner aged 18–35' },
  { icon: Leaf,       text: 'Eco-focused or sustainable business model' },
  { icon: Recycle,    text: 'Products align with SDG 12 (Responsible Consumption)' },
  { icon: BadgeCheck, text: 'Based in Ghana or serving Ghanaian communities' },
  { icon: Globe,      text: 'Committed to quality and timely fulfilment' },
]

const PROCESS_STEPS = [
  { step: '01', label: 'Fill the form',         desc: 'Tell us about your business' },
  { step: '02', label: 'Admin review',           desc: '2–3 business days' },
  { step: '03', label: 'Get approved',           desc: 'We notify you by email' },
  { step: '04', label: 'Start listing products', desc: 'Reach eco-conscious buyers' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function VendorApplyPage() {
  const router  = useRouter()
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: undefined,
      region: '',
      instagram: '',
      facebook: '',
      website: '',
    },
  })

  const descLength    = watch('business_description')?.length ?? 0
  const stmtLength    = watch('sustainability_statement')?.length ?? 0

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    const supabase = createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      toast.error('Please sign in to apply.')
      router.push('/login?redirect=/vendor/apply')
      setSubmitting(false)
      return
    }

    // Check if vendor profile already exists
    const { data: existing } = await supabase
      .from('vendor_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') {
        toast('Your application is already under review.', { icon: 'ℹ️' })
        setSubmitting(false)
        return
      }
      if (existing.status === 'approved') {
        toast.success('You are already an approved vendor!')
        router.push('/vendor/dashboard')
        setSubmitting(false)
        return
      }
    }

    // Insert vendor profile
    const profilePayload = {
      user_id:                 user.id,
      business_name:           values.business_name,
      business_description:    values.business_description,
      category:                values.category as ProductCategory,
      location:                values.location,
      region:                  values.region as GhanaRegion,
      phone:                   values.phone,
      sustainability_statement: values.sustainability_statement,
      social_links: {
        instagram: values.instagram || undefined,
        facebook:  values.facebook  || undefined,
        website:   values.website   || undefined,
      },
      status: 'pending',
    }

    const { error: insertErr } = existing
      ? await supabase.from('vendor_profiles').update(profilePayload).eq('id', existing.id)
      : await supabase.from('vendor_profiles').insert(profilePayload)

    if (insertErr) {
      toast.error('Failed to submit application. Please try again.')
      console.error(insertErr)
      setSubmitting(false)
      return
    }

    // Update user role to vendor (pending state)
    await supabase
      .from('users')
      .update({ role: 'vendor' })
      .eq('id', user.id)

    setSuccess(true)
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="container-app py-24 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-sand-900 mb-3">
            Application Submitted!
          </h1>
          <p className="text-sand-500 text-base mb-2">
            Thank you for applying to become an SWK Marketplace vendor.
          </p>
          <p className="text-sand-500 text-base mb-8">
            Our team will review your application within <strong className="text-sand-700">2–3 business days</strong> and contact you at your registered email.
          </p>
          <div className="flex gap-3">
            <Link
              href="/marketplace"
              className="px-5 py-2.5 border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-100 transition-colors"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/vendor/dashboard"
              className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
            >
              View Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-green-600 text-white py-12 md:py-16">
        <div className="container-app text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Leaf className="w-3.5 h-3.5" /> Join 500+ eco-entrepreneurs
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Become an SWK Vendor
          </h1>
          <p className="text-green-100 text-base md:text-lg max-w-xl mx-auto">
            Reach thousands of eco-conscious buyers across Ghana. Sell sustainably and grow your impact.
          </p>
        </div>
      </div>

      <div className="container-app py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Requirements sidebar ── */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-4">
                Requirements
              </h2>
              <ul className="space-y-3">
                {REQUIREMENTS.map((req, i) => {
                  const Icon = req.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm text-sand-700 pt-1">{req.text}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-sand-200 p-5 shadow-card">
              <h2 className="text-base font-display font-semibold text-sand-900 mb-4">
                How it works
              </h2>
              <ol className="space-y-4">
                {PROCESS_STEPS.map(s => (
                  <li key={s.step} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-sand-900">{s.label}</p>
                      <p className="text-xs text-sand-400">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                SWK Ghana charges a <strong>15% commission</strong> on each sale. This funds our operations,
                marketing, and support for youth entrepreneurs.
              </p>
            </div>
          </aside>

          {/* ── Application form ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-sand-200 p-6 md:p-8 shadow-card">
              <h2 className="text-xl font-display font-bold text-sand-900 mb-6">
                Vendor Application Form
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {/* Business name */}
                <div>
                  <label className="form-label">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('business_name')}
                    className="form-input"
                    placeholder="e.g. Kojo&apos;s Organic Farm"
                  />
                  {errors.business_name && (
                    <p className="form-error">{errors.business_name.message}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="form-label">
                    Business Category <span className="text-red-500">*</span>
                  </label>
                  <select {...register('category')} className="form-input">
                    <option value="">Select a category</option>
                    {(Object.keys(CATEGORY_META) as ProductCategory[]).map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="form-error">{errors.category.message}</p>
                  )}
                </div>

                {/* Business description */}
                <div>
                  <label className="form-label">
                    Business Description <span className="text-red-500">*</span>
                    <span className="ml-1 text-sand-400 font-normal">(min 100 characters)</span>
                  </label>
                  <textarea
                    {...register('business_description')}
                    className="form-input min-h-[120px] resize-y"
                    placeholder="Tell us about your business, what you sell, and how you operate..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.business_description ? (
                      <p className="form-error">{errors.business_description.message}</p>
                    ) : <span />}
                    <span className={cn('text-xs', descLength < 100 ? 'text-sand-400' : 'text-green-600')}>
                      {descLength}/100
                    </span>
                  </div>
                </div>

                {/* Location + region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      City / Town <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('location')}
                      className="form-input"
                      placeholder="e.g. Kumasi"
                    />
                    {errors.location && (
                      <p className="form-error">{errors.location.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">
                      Region <span className="text-red-500">*</span>
                    </label>
                    <select {...register('region')} className="form-input">
                      <option value="">Select region</option>
                      {GHANA_REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {errors.region && (
                      <p className="form-error">{errors.region.message}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="form-label">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="form-input"
                    placeholder="+233 24 000 0000"
                  />
                  {errors.phone && (
                    <p className="form-error">{errors.phone.message}</p>
                  )}
                </div>

                {/* SDG 12 statement */}
                <div>
                  <label className="form-label">
                    Sustainability Statement <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-sand-400 mb-1.5">
                    Describe how your business supports SDG 12 (Responsible Consumption &amp; Production).
                  </p>
                  <textarea
                    {...register('sustainability_statement')}
                    className="form-input min-h-[120px] resize-y"
                    placeholder="e.g. We use zero pesticides and package all products in biodegradable materials. Our supply chain sources directly from local farmers, reducing food miles by 80%..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.sustainability_statement ? (
                      <p className="form-error">{errors.sustainability_statement.message}</p>
                    ) : <span />}
                    <span className={cn('text-xs', stmtLength < 50 ? 'text-sand-400' : 'text-green-600')}>
                      {stmtLength}/50
                    </span>
                  </div>
                </div>

                {/* Social links */}
                <div>
                  <label className="form-label">Social Links <span className="text-sand-400 font-normal">(optional)</span></label>
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sand-400 font-medium">instagram.com/</span>
                      <input
                        {...register('instagram')}
                        className="form-input pl-28"
                        placeholder="yourhandle"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sand-400 font-medium">facebook.com/</span>
                      <input
                        {...register('facebook')}
                        className="form-input pl-[5.5rem]"
                        placeholder="yourpage"
                      />
                    </div>
                    <input
                      {...register('website')}
                      className="form-input"
                      placeholder="https://yourwebsite.com"
                    />
                    {errors.website && (
                      <p className="form-error">{errors.website.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm text-sm"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    ) : (
                      <>Submit Application <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <p className="text-xs text-sand-400 text-center mt-3">
                    By submitting you agree to SWK Marketplace&apos;s{' '}
                    <Link href="/terms" className="text-green-600 hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-green-600 hover:underline">Vendor Policy</Link>.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
