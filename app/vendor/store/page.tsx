'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Store,
  Users,
  PlusCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import type { VendorProfile } from '@/types'

const currentYear = new Date().getFullYear()

const schema = z.object({
  story: z.string().max(4000, 'Keep your story under 4000 characters').optional().or(z.literal('')),
  year_founded: z
    .union([z.coerce.number().int().min(1950, 'Enter a valid year').max(currentYear, 'Year cannot be in the future'), z.literal('')])
    .optional(),
  team_size: z
    .union([z.coerce.number().int().min(1, 'At least 1').max(10000, 'Enter a realistic team size'), z.literal('')])
    .optional(),
  website: z.string().url('Enter a full URL, e.g. https://mybusiness.com').optional().or(z.literal('')),
  instagram: z.string().url('Enter the full profile URL').optional().or(z.literal('')),
  facebook: z.string().url('Enter the full profile URL').optional().or(z.literal('')),
  twitter: z.string().url('Enter the full profile URL').optional().or(z.literal('')),
  founders: z
    .array(
      z.object({
        name: z.string().min(2, 'Name is required'),
        role: z.string().min(2, 'Role is required'),
        bio: z.string().max(300, 'Keep bios under 300 characters').optional().or(z.literal('')),
      }),
    )
    .max(8, 'Up to 8 team members'),
})

type FormValues = z.infer<typeof schema>

export default function VendorStoreProfilePage() {
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { founders: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'founders' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/vendor/store')
        return
      }

      const { data } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        router.push('/vendor/apply')
        return
      }

      const v = data as VendorProfile
      setVendor(v)
      reset({
        story: v.story ?? '',
        year_founded: v.year_founded ?? '',
        team_size: v.team_size ?? '',
        website: v.website ?? '',
        instagram: v.social_links?.instagram ?? '',
        facebook: v.social_links?.facebook ?? '',
        twitter: v.social_links?.twitter ?? '',
        founders: (v.founders ?? []).map(f => ({ name: f.name, role: f.role, bio: f.bio ?? '' })),
      })
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!vendor) return
    const supabase = createClient()

    const { error } = await supabase
      .from('vendor_profiles')
      .update({
        story: values.story || null,
        year_founded: values.year_founded === '' || values.year_founded === undefined ? null : values.year_founded,
        team_size: values.team_size === '' || values.team_size === undefined ? null : values.team_size,
        website: values.website || null,
        social_links: {
          ...(vendor.social_links ?? {}),
          instagram: values.instagram || undefined,
          facebook: values.facebook || undefined,
          twitter: values.twitter || undefined,
        },
        founders: values.founders.map(f => ({ name: f.name, role: f.role, bio: f.bio || undefined })),
      })
      .eq('id', vendor.id)

    if (error) {
      toast.error('Could not save your store profile, please try again')
      return
    }
    toast.success('Store profile saved!')
    router.refresh()
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

  const storeHref = `/store/${vendor?.slug ?? vendor?.id}`

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <main className="container-app py-8 max-w-3xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-sand-900 flex items-center gap-2">
              <Store className="w-6 h-6 text-green-600" /> My Store Page
            </h1>
            <p className="text-sm text-sand-500 mt-1 max-w-lg">
              This is your mini-website. Everything here appears on your public store page, the
              link you share with customers, even if you don&rsquo;t have a website of your own.
            </p>
          </div>
          <Link
            href={storeHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-sand-200 text-sm font-medium text-sand-700 rounded-lg hover:bg-sand-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Preview store
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* ── Story ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <h2 className="text-base font-display font-semibold text-sand-900 mb-1">Your story</h2>
            <p className="text-xs text-sand-400 mb-4">
              How did the business start? What do you make, and why does it matter? Buyers love
              knowing who they&rsquo;re supporting. (Blank lines create paragraphs.)
            </p>
            <textarea
              {...register('story')}
              rows={8}
              className="form-input resize-y"
              placeholder="We started in 2021 when…"
            />
            {errors.story && <p className="form-error">{errors.story.message}</p>}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="form-label" htmlFor="year_founded">Year founded</label>
                <input id="year_founded" type="number" {...register('year_founded')} className="form-input" placeholder="2021" />
                {errors.year_founded && <p className="form-error">{errors.year_founded.message as string}</p>}
              </div>
              <div>
                <label className="form-label" htmlFor="team_size">Team size</label>
                <input id="team_size" type="number" {...register('team_size')} className="form-input" placeholder="5" />
                {errors.team_size && <p className="form-error">{errors.team_size.message as string}</p>}
              </div>
            </div>
          </section>

          {/* ── Team ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-display font-semibold text-sand-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" /> Founders &amp; team
              </h2>
              <span className="text-xs text-sand-400">{fields.length}/8</span>
            </div>
            <p className="text-xs text-sand-400 mb-4">
              Add the people behind the business, founders, makers, farm leads. Shown as
              &ldquo;Meet the people behind it&rdquo; on your store page.
            </p>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-sand-200 rounded-xl p-4 relative">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove team member"
                    className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="form-label">Full name</label>
                      <input {...register(`founders.${index}.name`)} className="form-input" placeholder="Ama Asante" />
                      {errors.founders?.[index]?.name && (
                        <p className="form-error">{errors.founders[index]?.name?.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Role</label>
                      <input {...register(`founders.${index}.role`)} className="form-input" placeholder="Co-founder & CEO" />
                      {errors.founders?.[index]?.role && (
                        <p className="form-error">{errors.founders[index]?.role?.message}</p>
                      )}
                    </div>
                  </div>
                  <label className="form-label">Short bio (optional)</label>
                  <textarea
                    {...register(`founders.${index}.bio`)}
                    rows={2}
                    className="form-input resize-none"
                    placeholder="Agronomist leading our regenerative farming programme…"
                  />
                  {errors.founders?.[index]?.bio && (
                    <p className="form-error">{errors.founders[index]?.bio?.message}</p>
                  )}
                </div>
              ))}
            </div>

            {fields.length < 8 && (
              <button
                type="button"
                onClick={() => append({ name: '', role: '', bio: '' })}
                className="mt-4 flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Add team member
              </button>
            )}
          </section>

          {/* ── Links ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <h2 className="text-base font-display font-semibold text-sand-900 mb-1">Website &amp; socials</h2>
            <p className="text-xs text-sand-400 mb-4">
              Shown in the contact section of your store page. All optional.
            </p>
            <div className="space-y-3">
              {([
                { name: 'website', icon: Globe, placeholder: 'https://mybusiness.com', label: 'Website' },
                { name: 'instagram', icon: Instagram, placeholder: 'https://instagram.com/mybusiness', label: 'Instagram' },
                { name: 'facebook', icon: Facebook, placeholder: 'https://facebook.com/mybusiness', label: 'Facebook' },
                { name: 'twitter', icon: Twitter, placeholder: 'https://x.com/mybusiness', label: 'X (Twitter)' },
              ] as const).map(({ name, icon: Icon, placeholder, label }) => (
                <div key={name}>
                  <label className="form-label" htmlFor={name}>{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                    <input id={name} {...register(name)} className="form-input pl-9" placeholder={placeholder} />
                  </div>
                  {errors[name] && <p className="form-error">{errors[name]?.message}</p>}
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/vendor/dashboard"
              className="px-5 py-2.5 text-sm font-medium text-sand-600 hover:text-sand-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save store profile
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
