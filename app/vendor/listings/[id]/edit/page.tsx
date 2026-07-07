'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  PlusCircle,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import {
  GHANA_REGIONS,
  CATEGORY_META,
  VALUE_TAG_META,
  type Product,
  type ProductCategory,
  type GhanaRegion,
  type ValueTag,
  type SDGTag,
} from '@/types'

// ─── Constants (same as new listing page) ────────────────────────────────────

const SDG_OPTIONS: { value: SDGTag; label: string; color: string }[] = [
  { value: 'sdg_1_no_poverty',               label: 'SDG 1, No Poverty',                   color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'sdg_8_decent_work',              label: 'SDG 8, Decent Work & Economic Growth', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'sdg_12_responsible_consumption', label: 'SDG 12, Responsible Consumption',      color: 'bg-gold-50 border-gold-200 text-gold-700' },
  { value: 'sdg_13_climate_action',          label: 'SDG 13, Climate Action',               color: 'bg-teal-50 border-teal-200 text-teal-700' },
  { value: 'sdg_15_life_on_land',            label: 'SDG 15, Life on Land',                 color: 'bg-green-50 border-green-200 text-green-700' },
]

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  title:             z.string().min(5, 'Title must be at least 5 characters'),
  short_description: z.string().min(10, 'Short description is required').max(160, 'Max 160 characters'),
  description:       z.string().min(50, 'Description must be at least 50 characters'),
  price_ghs:         z.coerce.number({ invalid_type_error: 'Price is required' }).positive('Price must be greater than 0'),
  category:          z.enum(['agribusiness', 'recycled_upcycled', 'handmade_crafts', 'organic_produce'], {
    required_error: 'Please select a category',
  }),
  stock_quantity:    z.coerce.number().int().min(0, 'Stock cannot be negative').default(1),
  unit:              z.string().optional(),
  minimum_order:     z.coerce.number().int().min(1, 'Minimum order must be at least 1').default(1),
  location:          z.string().min(2, 'Please enter a location'),
  region:            z.string().min(1, 'Please select a region'),
  sdg_tags:          z.array(z.string()).min(1, 'Select at least one SDG tag'),
  value_tags:        z.array(z.string()),
  images:            z.array(z.object({ url: z.string() })),
})

type FormData = z.infer<typeof schema>

// ─── Component ───────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const params    = useParams<{ id: string }>()
  const router    = useRouter()
  const productId = params.id

  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound,   setNotFound]   = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [product,    setProduct]    = useState<Product | null>(null)
  const [vendorId,   setVendorId]   = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setValue,
    getValues,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      stock_quantity: 1,
      minimum_order:  1,
      sdg_tags:       [],
      value_tags:     [],
      images:         [{ url: '' }],
    },
  })

  const { fields: imageFields, append: addImage, remove: removeImage } = useFieldArray({
    control,
    name: 'images',
  })

  const shortDescLen = watch('short_description')?.length ?? 0
  const watchedSdg   = watch('sdg_tags')
  const watchedVal   = watch('value_tags')

  useEffect(() => {
    loadProduct()
  }, [productId])

  async function loadProduct() {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=/vendor/listings/' + productId + '/edit')
      return
    }

    // Fetch vendor profile
    const { data: vendor } = await supabase
      .from('vendor_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!vendor || vendor.status !== 'approved') {
      router.push('/vendor/dashboard')
      return
    }

    setVendorId(vendor.id)

    // Fetch product, must belong to this vendor
    const { data: prod, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('vendor_id', vendor.id)
      .single()

    if (error || !prod) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const p = prod as Product
    setProduct(p)

    // Populate form
    const imageValues = (p.images ?? []).length > 0
      ? p.images.map(url => ({ url }))
      : [{ url: '' }]

    reset({
      title:             p.title,
      short_description: p.short_description,
      description:       p.description,
      price_ghs:         p.price_ghs,
      category:          p.category as ProductCategory,
      stock_quantity:    p.stock_quantity,
      unit:              p.unit ?? '',
      minimum_order:     p.minimum_order ?? 1,
      location:          p.location,
      region:            p.region,
      sdg_tags:          p.sdg_tags ?? [],
      value_tags:        p.value_tags ?? [],
      images:            imageValues,
    })

    setLoading(false)
  }

  function toggleArrayValue(field: 'sdg_tags' | 'value_tags', value: string) {
    const current: string[] = getValues(field) ?? []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    setValue(field, next, { shouldValidate: true })
  }

  async function onSubmit(values: FormData) {
    if (!vendorId || !product) return
    setSubmitting(true)

    const supabase = createClient()

    const imageUrls = values.images
      .map(img => img.url.trim())
      .filter(url => url.length > 0)

    // If content changed on an approved listing, set back to pending_review
    const contentChanged =
      values.title             !== product.title             ||
      values.short_description !== product.short_description ||
      values.description       !== product.description       ||
      values.price_ghs         !== product.price_ghs         ||
      values.category          !== product.category

    const newStatus = (product.status === 'approved' && contentChanged)
      ? 'pending_review'
      : product.status

    const payload = {
      title:             values.title,
      short_description: values.short_description,
      description:       values.description,
      price_ghs:         values.price_ghs,
      price:             Math.round(values.price_ghs * 100),
      category:          values.category as ProductCategory,
      stock_quantity:    values.stock_quantity,
      unit:              values.unit || null,
      minimum_order:     values.minimum_order,
      location:          values.location,
      region:            values.region as GhanaRegion,
      sdg_tags:          values.sdg_tags as SDGTag[],
      value_tags:        values.value_tags as ValueTag[],
      images:            imageUrls,
      status:            newStatus,
    }

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', product.id)
      .eq('vendor_id', vendorId)

    if (error) {
      toast.error('Failed to update listing. Please try again.')
      console.error(error)
      setSubmitting(false)
      return
    }

    if (newStatus === 'pending_review' && product.status === 'approved') {
      toast.success('Listing updated and sent for re-review (content changed).')
    } else {
      toast.success('Listing updated successfully!')
    }

    setSuccess(true)
    setSubmitting(false)
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="container-app py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-sand-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-sand-900 mb-2">Listing not found</h1>
          <p className="text-sand-500 text-sm mb-6">
            This listing doesn&rsquo;t exist or doesn&rsquo;t belong to your account.
          </p>
          <Link
            href="/vendor/listings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Listings
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div className="container-app max-w-lg mx-auto py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-sand-900 mb-3">Listing Updated!</h1>
          <p className="text-sand-500 text-base mb-8">
            Your changes have been saved successfully.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/vendor/listings"
              className="px-5 py-2.5 border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-50 transition-colors"
            >
              All Listings
            </Link>
            <button
              onClick={() => setSuccess(false)}
              className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </div>
    )
  }

  const wasApproved = product?.status === 'approved'

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="container-app py-6 md:py-8 max-w-3xl">
        {/* Back */}
        <Link
          href="/vendor/listings"
          className="inline-flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Listings
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-sand-900">Edit Listing</h1>
          <p className="text-sand-500 text-sm mt-1 line-clamp-1">{product?.title}</p>
        </div>

        {/* Content change warning for approved listings */}
        {wasApproved && (
          <div className="flex items-start gap-3 p-4 bg-gold-50 border border-gold-100 rounded-xl text-gold-700 mb-6">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              This listing is currently <strong>live</strong>. Changing the title, description, or price will
              send it back to <strong>pending review</strong> until approved by SWK Ghana. Price and stock
              changes do not require re-review unless the title or description also changes.
            </p>
          </div>
        )}

        {/* Rejection notice */}
        {product?.status === 'rejected' && product.rejection_reason && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-6">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-0.5">Previously Rejected</p>
              <p className="text-xs">{product.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-700 mb-6">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            All listings must align with{' '}
            <strong>SDG 12 (Responsible Consumption &amp; Production)</strong>.
            You cannot change the product&rsquo;s URL slug.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

          {/* ── BASIC INFO ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card space-y-5">
            <h2 className="text-base font-display font-semibold text-sand-900">Basic Information</h2>

            {/* Slug (read-only) */}
            {product?.slug && (
              <div>
                <label className="form-label">Product URL (cannot be changed)</label>
                <div className="form-input bg-sand-50 text-sand-400 cursor-not-allowed text-xs font-mono">
                  /marketplace/{product.slug}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="form-label">Product Title <span className="text-red-500">*</span></label>
              <input {...register('title')} className="form-input" />
              {errors.title && <p className="form-error">{errors.title.message}</p>}
            </div>

            {/* Short description */}
            <div>
              <label className="form-label">
                Short Description <span className="text-red-500">*</span>
                <span className="ml-1 text-sand-400 font-normal">(max 160 chars)</span>
              </label>
              <input {...register('short_description')} className="form-input" />
              <div className="flex justify-between mt-1">
                {errors.short_description
                  ? <p className="form-error">{errors.short_description.message}</p>
                  : <span />}
                <span className={cn('text-xs', shortDescLen > 160 ? 'text-red-500' : 'text-sand-400')}>
                  {shortDescLen}/160
                </span>
              </div>
            </div>

            {/* Full description */}
            <div>
              <label className="form-label">Full Description <span className="text-red-500">*</span></label>
              <textarea {...register('description')} className="form-input min-h-[140px] resize-y" />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category <span className="text-red-500">*</span></label>
              <select {...register('category')} className="form-input">
                <option value="">Select a category</option>
                {(Object.keys(CATEGORY_META) as ProductCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="form-error">{errors.category.message}</p>}
            </div>
          </section>

          {/* ── PRICING & INVENTORY ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card space-y-5">
            <h2 className="text-base font-display font-semibold text-sand-900">Pricing &amp; Inventory</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Price (GHS) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sand-400 font-medium">GHS</span>
                  <input {...register('price_ghs')} type="number" step="0.01" min="0" className="form-input pl-12" />
                </div>
                {errors.price_ghs && <p className="form-error">{errors.price_ghs.message}</p>}
              </div>
              <div>
                <label className="form-label">Stock Quantity</label>
                <input {...register('stock_quantity')} type="number" min="0" className="form-input" />
                {errors.stock_quantity && <p className="form-error">{errors.stock_quantity.message}</p>}
              </div>
              <div>
                <label className="form-label">Unit <span className="text-sand-400 font-normal">(optional)</span></label>
                <input {...register('unit')} className="form-input" placeholder="e.g. per kg, per dozen" />
              </div>
              <div>
                <label className="form-label">Minimum Order</label>
                <input {...register('minimum_order')} type="number" min="1" className="form-input" />
                {errors.minimum_order && <p className="form-error">{errors.minimum_order.message}</p>}
              </div>
            </div>
          </section>

          {/* ── LOCATION ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card space-y-5">
            <h2 className="text-base font-display font-semibold text-sand-900">Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">City / Town <span className="text-red-500">*</span></label>
                <input {...register('location')} className="form-input" />
                {errors.location && <p className="form-error">{errors.location.message}</p>}
              </div>
              <div>
                <label className="form-label">Region <span className="text-red-500">*</span></label>
                <select {...register('region')} className="form-input">
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {errors.region && <p className="form-error">{errors.region.message}</p>}
              </div>
            </div>
          </section>

          {/* ── SDG TAGS ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <h2 className="text-base font-display font-semibold text-sand-900 mb-1">
              SDG Alignment <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-sand-400 mb-4">Select all SDGs your product supports.</p>
            <div className="space-y-2">
              {SDG_OPTIONS.map(sdg => {
                const checked = watchedSdg?.includes(sdg.value)
                return (
                  <label
                    key={sdg.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      checked ? sdg.color : 'bg-sand-50 border-sand-200 hover:border-sand-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleArrayValue('sdg_tags', sdg.value)}
                    />
                    <div className={cn(
                      'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border',
                      checked ? 'bg-current border-current' : 'border-sand-300 bg-white',
                    )}>
                      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{sdg.label}</span>
                  </label>
                )
              })}
            </div>
            {errors.sdg_tags && <p className="form-error mt-2">{errors.sdg_tags.message}</p>}
          </section>

          {/* ── VALUE TAGS ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <h2 className="text-base font-display font-semibold text-sand-900 mb-1">Value Tags</h2>
            <p className="text-xs text-sand-400 mb-4">Help buyers find products matching their values.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(VALUE_TAG_META) as [ValueTag, { label: string; icon: string }][]).map(([key, meta]) => {
                const checked = watchedVal?.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleArrayValue('value_tags', key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                      checked
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-sand-600 border-sand-200 hover:border-green-200 hover:text-green-700',
                    )}
                  >
                    <span>{meta.icon}</span> {meta.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── IMAGES ── */}
          <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-display font-semibold text-sand-900">Product Images</h2>
              <span className="text-xs text-sand-400">{imageFields.length}/5</span>
            </div>
            <p className="text-xs text-sand-400 mb-4">
              Enter image URLs. The first image is the primary listing photo.
            </p>
            <div className="space-y-3">
              {imageFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
                    <input
                      {...register(`images.${index}.url`)}
                      className="form-input pl-9"
                      placeholder={index === 0 ? 'Primary image URL' : `Image ${index + 1} URL`}
                    />
                  </div>
                  {imageFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {imageFields.length < 5 && (
              <button
                type="button"
                onClick={() => addImage({ url: '' })}
                className="mt-3 flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Add another image
              </button>
            )}
          </section>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-8">
            <Link
              href="/vendor/listings"
              className="px-5 py-2.5 border border-sand-200 text-sand-700 text-sm font-medium rounded-lg hover:bg-sand-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:pointer-events-none transition-colors shadow-sm"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
