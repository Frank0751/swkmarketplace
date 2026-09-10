'use client'

import { useEffect, useState } from 'react'
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
  LogIn,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { DocumentUploader, type UploadedDocument } from '@/components/vendor/DocumentUploader'
import { cn } from '@/lib/utils'
import { GHANA_REGIONS, CATEGORY_META } from '@/types'
import type { ProductCategory } from '@/types'

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
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  // null while checking; tells visitors up front that they need an account,
  // instead of after they have filled in the whole form
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

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

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setSignedIn(!!user))
  }, [])

  const descLength    = watch('business_description')?.length ?? 0
  const stmtLength    = watch('sustainability_statement')?.length ?? 0

  async function onSubmit(values: FormData) {
    setSubmitting(true)
    try {
      // Submitted through the API: it validates, always files the application
      // as 'pending', and tells the SWK Ghana team straight away
      const res = await fetch('/api/vendors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          documents: documents.map(d => ({ public_id: d.public_id, label: d.label })),
        }),
      })
      const json = await res.json().catch(() => ({}))

      if (res.status === 401) {
        toast.error('Please sign in to apply.')
        router.push('/login?redirect=/vendor/apply')
        return
      }
      if (json.code === 'already_approved') {
        toast.success('You are already an approved vendor!')
        router.push('/vendor/dashboard')
        return
      }
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to submit application. Please try again.')
        return
      }

      setSuccess(true)
      window.scrollTo(0, 0)
    } catch {
      toast.error('Something went wrong. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <main id="main" className="container-app py-24 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-display font-bold text-sand-900 mb-3">
            Application Submitted!
          </h1>
          <p className="text-sand-600 text-base mb-2">
            Thank you for applying to become an SWK Marketplace vendor.
          </p>
          <p className="text-sand-600 text-base mb-8">
            Our team will review your application within <strong className="text-sand-700">2–3 business days</strong> and contact you at your registered email.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center min-h-[44px] px-5 border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-100 transition-colors"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/vendor/dashboard"
              className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              View Dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </main>
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
            <Leaf className="w-3.5 h-3.5" aria-hidden="true" /> Founding vendors wanted
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Become an SWK Vendor
          </h1>
          <p className="text-green-50 text-base md:text-lg max-w-xl mx-auto">
            Reach eco-conscious buyers across Ghana, get paid safely through escrow, and grow your impact.
          </p>
        </div>
      </div>

      <main id="main" className="container-app py-10 md:py-14">
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
                        <Icon className="w-4 h-4 text-green-600" aria-hidden="true" />
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
                      <p className="text-xs text-sand-600">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs leading-relaxed">
                SWK Ghana charges a <strong>15% commission</strong> on each sale, and nothing else. It funds
                the platform, payments and support for youth entrepreneurs. You receive the rest by mobile
                money or bank transfer once the buyer confirms delivery.
              </p>
            </div>
          </aside>

          {/* ── Application form ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-sand-200 p-6 md:p-8 shadow-card">
              <h2 className="text-xl font-display font-bold text-sand-900 mb-6">
                Vendor Application Form
              </h2>

              {signedIn === false && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 mb-6 rounded-xl border border-gold-200 bg-gold-50">
                  <LogIn className="w-5 h-5 flex-shrink-0 text-gold-600" aria-hidden="true" />
                  <p className="flex-1 text-sm text-sand-800">
                    <strong>You&rsquo;ll need a free account to apply.</strong> Sign in or sign up first so
                    your application, and the photos you add, are saved to you.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href="/login?redirect=/vendor/apply"
                      className="inline-flex items-center min-h-[44px] px-4 rounded-lg border-2 border-sand-200 bg-white text-sm font-semibold text-sand-800 hover:bg-sand-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                {/* Business name */}
                <div>
                  <label htmlFor="business_name" className="form-label">
                    Business Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="business_name" {...register('business_name')}
                    aria-invalid={!!errors.business_name}
                    aria-describedby={errors.business_name ? 'business_name-error' : undefined}
                    className="form-input"
                    placeholder="e.g. Kojo&apos;s Organic Farm"
                  />
                  {errors.business_name && (
                    <p id="business_name-error" role="alert" className="form-error">{errors.business_name.message}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="form-label">
                    Business Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="category" {...register('category')}
                    aria-invalid={!!errors.category}
                    aria-describedby={errors.category ? 'category-error' : undefined}
                    className="form-input"
                  >
                    <option value="">Select a category</option>
                    {(Object.keys(CATEGORY_META) as ProductCategory[]).map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p id="category-error" role="alert" className="form-error">{errors.category.message}</p>
                  )}
                </div>

                {/* Business description */}
                <div>
                  <label htmlFor="business_description" className="form-label">
                    Business Description <span className="text-red-600">*</span>
                    <span className="ml-1 text-sand-600 font-normal">(min 100 characters)</span>
                  </label>
                  <textarea
                    id="business_description" {...register('business_description')}
                    aria-invalid={!!errors.business_description}
                    aria-describedby="business_description-count"
                    className="form-input min-h-[120px] resize-y"
                    placeholder="Tell us about your business, what you sell, and how you operate..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.business_description ? (
                      <p role="alert" className="form-error">{errors.business_description.message}</p>
                    ) : <span />}
                    <span id="business_description-count" className={cn('text-xs', descLength < 100 ? 'text-sand-600' : 'text-green-700')}>
                      {descLength}/100
                    </span>
                  </div>
                </div>

                {/* Location + region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="location" className="form-label">
                      City / Town <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="location" {...register('location')}
                      aria-invalid={!!errors.location}
                      className="form-input"
                      placeholder="e.g. Kumasi"
                    />
                    {errors.location && (
                      <p role="alert" className="form-error">{errors.location.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="region" className="form-label">
                      Region <span className="text-red-600">*</span>
                    </label>
                    <select id="region" {...register('region')} aria-invalid={!!errors.region} className="form-input">
                      <option value="">Select region</option>
                      {GHANA_REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {errors.region && (
                      <p role="alert" className="form-error">{errors.region.message}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="form-label">
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="phone" {...register('phone')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={!!errors.phone}
                    aria-describedby="phone-hint"
                    className="form-input"
                    placeholder="024 123 4567"
                  />
                  <p id="phone-hint" className="mt-1 text-xs text-sand-600">
                    Shown on your store page so buyers can ask questions.
                  </p>
                  {errors.phone && (
                    <p role="alert" className="form-error">{errors.phone.message}</p>
                  )}
                </div>

                {/* SDG 12 statement */}
                <div>
                  <label htmlFor="sustainability_statement" className="form-label">
                    Sustainability Statement <span className="text-red-600">*</span>
                  </label>
                  <p id="sustainability_statement-hint" className="text-xs text-sand-600 mb-1.5">
                    Describe how your business supports SDG 12 (Responsible Consumption &amp; Production).
                  </p>
                  <textarea
                    id="sustainability_statement" {...register('sustainability_statement')}
                    aria-invalid={!!errors.sustainability_statement}
                    aria-describedby="sustainability_statement-hint"
                    className="form-input min-h-[120px] resize-y"
                    placeholder="e.g. We use zero pesticides and package all products in biodegradable materials. Our supply chain sources directly from local farmers..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.sustainability_statement ? (
                      <p role="alert" className="form-error">{errors.sustainability_statement.message}</p>
                    ) : <span />}
                    <span className={cn('text-xs', stmtLength < 50 ? 'text-sand-600' : 'text-green-700')}>
                      {stmtLength}/50
                    </span>
                  </div>
                </div>

                {/* Supporting photos */}
                <fieldset>
                  <legend className="form-label">
                    Supporting photos <span className="text-sand-600 font-normal">(optional, up to 3)</span>
                  </legend>
                  <p className="text-xs text-sand-600 mb-2">
                    Photos of your products, your workspace or farm, or your business registration
                    certificate help us verify you faster.
                  </p>
                  <DocumentUploader value={documents} onChange={setDocuments} />
                </fieldset>

                {/* Social links */}
                {/* One legend for the group, plus a real label per input, so a
                    screen reader announces which of the three fields it is on. */}
                <fieldset>
                  <legend className="form-label">
                    Social Links <span className="text-sand-600 font-normal">(optional)</span>
                  </legend>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="instagram" className="sr-only">Instagram handle</label>
                      <div className="relative">
                        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sand-600 font-medium">instagram.com/</span>
                        <input
                          id="instagram"
                          {...register('instagram')}
                          className="form-input pl-28"
                          placeholder="yourhandle"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="facebook" className="sr-only">Facebook page</label>
                      <div className="relative">
                        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sand-600 font-medium">facebook.com/</span>
                        <input
                          id="facebook"
                          {...register('facebook')}
                          className="form-input pl-[5.5rem]"
                          placeholder="yourpage"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="website" className="sr-only">Website address</label>
                      <input
                        id="website"
                        {...register('website')}
                        aria-invalid={!!errors.website}
                        aria-describedby={errors.website ? 'website-error' : undefined}
                        className="form-input"
                        placeholder="https://yourwebsite.com"
                      />
                      {errors.website && (
                        <p id="website-error" role="alert" className="form-error">{errors.website.message}</p>
                      )}
                    </div>
                  </div>
                </fieldset>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm text-sm"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Submitting…</>
                    ) : (
                      <>Submit Application <ArrowRight className="w-4 h-4" aria-hidden="true" /></>
                    )}
                  </button>
                  <p className="text-xs text-sand-600 text-center mt-3">
                    By submitting you agree to SWK Marketplace&apos;s{' '}
                    <Link href="/terms#vendor-terms" className="text-green-700 underline underline-offset-2">Terms, including the vendor terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-green-700 underline underline-offset-2">Privacy Policy</Link>.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
