import { describe, it, expect } from 'vitest'
import {
  canTransition,
  isConfirmationOverdue,
  ORDER_TRANSITIONS,
  DELIVERY_FEE_GHS,
  CONFIRMATION_WINDOW_DAYS,
} from '@/lib/marketplace/orders'
import {
  normalizeGhanaPhone,
  normalizeContactPhone,
  formatGhanaPhone,
  whatsappDigits,
} from '@/lib/marketplace/phone'
import { cleanSearchTerm, productSearchFilter } from '@/lib/marketplace/search'
import { listingSchema, reviewedContentChanged, changedFields } from '@/lib/marketplace/listing'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { assessPayment, expectedPesewas } from '@/lib/paystack/confirm'
import { signUploadParams, signedDeliveryUrl } from '@/lib/cloudinary/signing'
import type { OrderStatus } from '@/types'

const DAY = 24 * 60 * 60 * 1000

describe('order transitions', () => {
  it('vendors act only on paid orders', () => {
    expect(canTransition('vendor', 'pending', 'confirmed')).toBe(false)
    expect(canTransition('vendor', 'paid', 'confirmed')).toBe(true)
    expect(canTransition('vendor', 'confirmed', 'dispatched')).toBe(true)
  })

  it('buyers confirm delivery only once dispatched', () => {
    expect(canTransition('buyer', 'dispatched', 'delivered')).toBe(true)
    expect(canTransition('buyer', 'paid', 'delivered')).toBe(false)
  })

  it('buyers can report a problem while their money is held', () => {
    for (const from of ['paid', 'confirmed', 'dispatched'] as OrderStatus[]) {
      expect(canTransition('buyer', from, 'disputed'), from).toBe(true)
    }
    expect(canTransition('buyer', 'delivered', 'disputed')).toBe(false)
  })

  it('nobody reaches "released" through an order update (only the payouts page does)', () => {
    for (const actor of Object.keys(ORDER_TRANSITIONS) as (keyof typeof ORDER_TRANSITIONS)[]) {
      for (const targets of Object.values(ORDER_TRANSITIONS[actor])) {
        expect(targets).not.toContain('released')
      }
    }
  })

  it('admins resolve disputes as delivered or refunded', () => {
    expect(canTransition('admin', 'disputed', 'delivered')).toBe(true)
    expect(canTransition('admin', 'disputed', 'refunded')).toBe(true)
  })
})

describe('confirmation window', () => {
  const now = new Date('2026-09-10T12:00:00Z')

  it(`flags dispatched orders older than ${CONFIRMATION_WINDOW_DAYS} days`, () => {
    const old = new Date(now.getTime() - (CONFIRMATION_WINDOW_DAYS + 1) * DAY).toISOString()
    expect(isConfirmationOverdue({ status: 'dispatched', dispatched_at: old }, now)).toBe(true)
  })

  it('leaves recent or already-delivered orders alone', () => {
    const recent = new Date(now.getTime() - 2 * DAY).toISOString()
    const ancient = new Date(now.getTime() - 60 * DAY).toISOString()
    expect(isConfirmationOverdue({ status: 'dispatched', dispatched_at: recent }, now)).toBe(false)
    expect(isConfirmationOverdue({ status: 'delivered', dispatched_at: ancient }, now)).toBe(false)
  })

  it('charges one flat delivery fee', () => {
    expect(DELIVERY_FEE_GHS).toBe(20)
  })
})

describe('Ghana phone numbers', () => {
  it('accepts the ways people type them', () => {
    for (const input of ['024 123 4567', '0241234567', '+233 24 123 4567', '233241234567', '(024) 123-4567']) {
      expect(normalizeGhanaPhone(input), input).toBe('+233241234567')
    }
  })

  it('rejects numbers that cannot be Ghanaian', () => {
    for (const input of ['12345', '0141234567', '024123456', '', 'call me']) {
      expect(normalizeGhanaPhone(input), input).toBeNull()
    }
  })

  it('formats for display and for wa.me links', () => {
    expect(formatGhanaPhone('0241234567')).toBe('+233 24 123 4567')
    expect(whatsappDigits('024 123 4567')).toBe('233241234567')
  })

  it('lets vendors outside Ghana give an international number', () => {
    expect(normalizeContactPhone('+44 7700 900123')).toBe('+447700900123')
    expect(normalizeContactPhone('07700900123')).toBeNull()
  })
})

describe('product search', () => {
  it('strips characters that break PostgREST filters or act as LIKE wildcards', () => {
    expect(cleanSearchTerm('shea, butter (500g)')).toBe('shea butter 500g')
    expect(cleanSearchTerm('100%_cotton*')).toBe('100 cotton')
  })

  it('searches title, summary and description', () => {
    expect(productSearchFilter('honey')).toBe(
      'title.ilike.%honey%,short_description.ilike.%honey%,description.ilike.%honey%',
    )
  })

  it('returns nothing for an empty search', () => {
    expect(productSearchFilter('')).toBeNull()
    expect(productSearchFilter('  ,() ')).toBeNull()
  })
})

describe('listing validation', () => {
  const valid = {
    title: 'Raw Forest Honey',
    short_description: 'Pure honey from the Ashanti forest.',
    description: 'Harvested by hand from wild hives. '.repeat(3),
    price_ghs: 45,
    category: 'agribusiness',
    stock_quantity: 10,
    location: 'Kumasi',
    region: 'Ashanti',
    sdg_tags: ['sdg_12_responsible_consumption'],
    value_tags: ['organic'],
    images: ['https://res.cloudinary.com/demo/image/upload/honey.jpg'],
  }

  it('drops fields a vendor must not set', () => {
    const parsed = listingSchema.parse({ ...valid, status: 'approved', views: 9999, vendor_id: 'x' })
    expect(parsed).not.toHaveProperty('status')
    expect(parsed).not.toHaveProperty('views')
    expect(parsed).not.toHaveProperty('vendor_id')
  })

  it('requires https image links', () => {
    expect(listingSchema.safeParse({ ...valid, images: ['http://example.com/a.jpg'] }).success).toBe(false)
  })

  it('sends a live listing back to review only for reviewed fields', () => {
    const current = { title: 'Honey', description: 'Forest honey', images: ['a.jpg'], price_ghs: 45 }
    expect(reviewedContentChanged(current, { price_ghs: 50 } as Record<string, unknown>)).toBe(false)
    expect(reviewedContentChanged(current, { title: 'Honey' })).toBe(false)
    expect(reviewedContentChanged(current, { description: 'Forest honey  ' })).toBe(false)
    expect(reviewedContentChanged(current, { images: ['b.jpg'] })).toBe(true)
    expect(reviewedContentChanged(current, { title: 'Honey (500ml)' })).toBe(true)
  })

  it('writes only the fields that changed', () => {
    expect(changedFields({ title: 'A', price_ghs: 10 }, { title: 'A', price_ghs: 12 })).toEqual({ price_ghs: 12 })
  })
})

describe('payment verification', () => {
  const pending = { status: 'pending', total_amount: 120 }

  it('pays only a successful GHS payment of exactly the order total', () => {
    expect(assessPayment(pending, { status: 'success', amount: 12000, currency: 'GHS' })).toBe('pay')
  })

  it('refuses an underpayment, even one Paystack marks successful', () => {
    expect(assessPayment(pending, { status: 'success', amount: 100, currency: 'GHS' })).toBe('amount_mismatch')
    expect(assessPayment(pending, { status: 'success', amount: 12000, currency: 'NGN' })).toBe('amount_mismatch')
  })

  it('ignores unfinished payments and orders already settled', () => {
    expect(assessPayment(pending, { status: 'abandoned', amount: 12000, currency: 'GHS' })).toBe('not_successful')
    expect(assessPayment({ status: 'confirmed', total_amount: 120 }, { status: 'success', amount: 12000, currency: 'GHS' }))
      .toBe('already_processed')
  })

  it('converts GHS to pesewas without floating-point drift', () => {
    expect(expectedPesewas(10.1)).toBe(1010)
    expect(expectedPesewas('45.50')).toBe(4550)
  })
})

describe('Cloudinary signing (vectors produced by the official SDK)', () => {
  const secret = 'test_secret_Abc123'

  it('signs upload parameters', () => {
    expect(
      signUploadParams({ folder: 'swk-marketplace/vendor-docs/abc', timestamp: 1757500000, type: 'authenticated' }, secret),
    ).toBe('50dfea1909c9f386e4f3c53ab9cf37e96867d20b')
  })

  it('signs delivery URLs for private documents', () => {
    expect(
      signedDeliveryUrl({ cloudName: 'demo-cloud', publicId: 'swk-marketplace/vendor-docs/abc/xyz123', apiSecret: secret }),
    ).toBe('https://res.cloudinary.com/demo-cloud/image/authenticated/s--pSvBCHSq--/c_limit,f_auto,q_auto,w_1600/v1/swk-marketplace/vendor-docs/abc/xyz123')
  })
})

describe('image optimisation', () => {
  it('optimises only hosts configured in next.config', () => {
    expect(canOptimizeImage('/images/prod-honey.jpg')).toBe(true)
    expect(canOptimizeImage('https://res.cloudinary.com/demo/image/upload/a.jpg')).toBe(true)
    expect(canOptimizeImage('https://abc.supabase.co/storage/v1/object/a.jpg')).toBe(true)
    expect(canOptimizeImage('https://scontent.cdninstagram.com/a.jpg')).toBe(false)
    expect(canOptimizeImage('not a url')).toBe(false)
  })
})
