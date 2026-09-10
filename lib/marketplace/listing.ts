import { z } from 'zod'
import {
  GHANA_REGIONS,
  VALUE_TAG_META,
  type GhanaRegion,
  type ProductCategory,
  type SDGTag,
  type ValueTag,
} from '@/types'

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'agribusiness',
  'recycled_upcycled',
  'handmade_crafts',
  'organic_produce',
]

export const SDG_TAGS: SDGTag[] = [
  'sdg_1_no_poverty',
  'sdg_8_decent_work',
  'sdg_12_responsible_consumption',
  'sdg_13_climate_action',
  'sdg_15_life_on_land',
]

const VALUE_TAGS = Object.keys(VALUE_TAG_META) as ValueTag[]

/**
 * What a vendor may set on a listing. The API validates against this and
 * copies only these keys, so fields like status, views or vendor_id can't be
 * slipped into a request body.
 */
export const listingSchema = z.object({
  title:             z.string().trim().min(5, 'Title must be at least 5 characters').max(120, 'Keep the title under 120 characters'),
  short_description: z.string().trim().min(10, 'Short description is required').max(160, 'Max 160 characters'),
  description:       z.string().trim().min(50, 'Description must be at least 50 characters').max(5000, 'Keep the description under 5000 characters'),
  price_ghs:         z.coerce.number().positive('Price must be greater than 0').max(1_000_000, 'Price looks too high'),
  category:          z.enum(PRODUCT_CATEGORIES as [ProductCategory, ...ProductCategory[]]),
  stock_quantity:    z.coerce.number().int().min(0, 'Stock cannot be negative').max(1_000_000),
  unit:              z.string().trim().max(40).nullish(),
  minimum_order:     z.coerce.number().int().min(1, 'Minimum order must be at least 1').max(10_000).nullish(),
  location:          z.string().trim().min(2, 'Please enter a location').max(120),
  region:            z.enum(GHANA_REGIONS as [GhanaRegion, ...GhanaRegion[]]),
  sdg_tags:          z.array(z.enum(SDG_TAGS as [SDGTag, ...SDGTag[]])).min(1, 'Select at least one SDG tag').max(SDG_TAGS.length),
  value_tags:        z.array(z.enum(VALUE_TAGS as [ValueTag, ...ValueTag[]])).max(VALUE_TAGS.length),
  images:            z.array(z.string().url('Each image must be a valid link').startsWith('https://', 'Image links must start with https://')).max(5, 'Up to 5 images'),
})

export type ListingInput = z.infer<typeof listingSchema>

/**
 * Changing any of these on a live listing sends it back for review, because
 * buyers must see what SWK Ghana reviewed. Price and stock stay live.
 * Mirrors the products_guard trigger in migration 007.
 */
export const REVIEWED_FIELDS = ['title', 'description', 'short_description', 'images', 'category'] as const

type Reviewed = Partial<Record<(typeof REVIEWED_FIELDS)[number], unknown>>

function comparable(value: unknown): string {
  return typeof value === 'string' ? value.trim() : JSON.stringify(value ?? null)
}

/** True when `changes` alters a reviewed field of `current` (unchanged values sent back don't count). */
export function reviewedContentChanged(current: Reviewed, changes: Reviewed): boolean {
  return REVIEWED_FIELDS.some(
    field => field in changes && comparable(changes[field]) !== comparable(current[field]),
  )
}

/**
 * Only the fields whose value actually differs. The edit form sends every
 * field on each save; writing unchanged text back could still count as an
 * edit (for example after trimming whitespace) and needlessly send a live
 * listing back to review.
 */
export function changedFields<T extends Record<string, unknown>>(
  current: Record<string, unknown>,
  input: T,
): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (comparable(input[key]) !== comparable(current[key as string])) out[key] = input[key]
  }
  return out
}

/** First validation message, for a single-line API error */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Invalid request'
  const field = issue.path.join('.')
  return field ? `${field}: ${issue.message}` : issue.message
}
