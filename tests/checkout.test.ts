import { describe, it, expect } from 'vitest'
import {
  TEST_CARDS,
  TEST_OTP,
  luhnValid,
  detectBrand,
  formatCardNumber,
  formatExpiryInput,
  parseExpiry,
  isExpired,
  testCardForSaved,
} from '@/lib/payments/test-cards'
import { validateCardForm, validateMomoForm, cardNumberHint } from '@/lib/payments/forms'
import {
  normalizeMomoNumber,
  guessMomoNetwork,
  maskPhone,
  paymentMethodLabel,
  formatExpiry,
} from '@/lib/payments/methods'
import { decideNewCard, decideMomo, decideSavedMethod } from '@/lib/payments/demo'
import { priceCart, lineProblem, cartKind, type PriceableLine, type CatalogueProduct } from '@/lib/cart/pricing'
import { mergeLines, priceFromCatalogue, checkoutItems } from '@/lib/checkout/server'
import { createCheckoutSchema, payCheckoutSchema } from '@/lib/checkout/schema'
import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'
import { safeRedirect } from '@/lib/utils'

const NOW = new Date('2026-10-02T12:00:00Z')
const VISA = TEST_CARDS.find(c => c.id === 'visa-approved')!
const OTP_CARD = TEST_CARDS.find(c => c.outcome === 'otp')!

// ─── Test cards ───────────────────────────────────────────────────────────────

describe('test cards', () => {
  it('every test card is a valid card number of the brand it claims', () => {
    for (const card of TEST_CARDS) {
      expect(luhnValid(card.number), card.id).toBe(true)
      expect(detectBrand(card.number), card.id).toBe(card.brand)
    }
  })

  it('covers approved, one-time code and declined outcomes', () => {
    const outcomes = new Set(TEST_CARDS.map(c => c.outcome))
    for (const o of ['approved', 'otp', 'declined', 'insufficient_funds']) expect(outcomes.has(o as never)).toBe(true)
  })

  it('detects card networks from the leading digits', () => {
    expect(detectBrand('4111')).toBe('visa')
    expect(detectBrand('5105105105105100')).toBe('mastercard')
    expect(detectBrand('2221000000000009')).toBe('mastercard')
    expect(detectBrand('5061001234567890123')).toBe('verve')
    expect(detectBrand('6011000000000004')).toBeNull()
  })

  it('formats numbers and expiry dates as they are typed', () => {
    expect(formatCardNumber('4084084084084081')).toBe('4084 0840 8408 4081')
    expect(formatCardNumber('4084 08a4-0840')).toBe('4084 0840 840')
    expect(formatExpiryInput('1229')).toBe('12/29')
    expect(formatExpiryInput('1')).toBe('1')
    expect(parseExpiry('8/29')).toEqual({ month: 8, year: 2029 })
    expect(parseExpiry('13/29')).toBeNull()
    expect(parseExpiry('12/2031')).toEqual({ month: 12, year: 2031 })
  })

  it('a card is valid through the end of its expiry month', () => {
    expect(isExpired(10, 2026, NOW)).toBe(false)
    expect(isExpired(9, 2026, NOW)).toBe(true)
    expect(isExpired(1, 2027, NOW)).toBe(false)
  })

  it('a saved card is matched back to its test card by brand and last 4', () => {
    expect(testCardForSaved('mastercard', OTP_CARD.number.slice(-4))?.outcome).toBe('otp')
    expect(testCardForSaved('visa', '0000')).toBeUndefined()
  })
})

// ─── Card and mobile money forms ──────────────────────────────────────────────

describe('card form', () => {
  const filled = { number: formatCardNumber(VISA.number), expiry: '12/29', cvc: '123', name: 'Ama Mensah' }

  it('accepts a test card and sends only the last 4 digits and expiry', () => {
    const { errors, payload } = validateCardForm(filled, NOW)
    expect(errors).toEqual({})
    expect(payload).toEqual({ test_card_id: VISA.id, last4: '4081', exp_month: 12, exp_year: 2029, holder_name: 'Ama Mensah' })
    expect(JSON.stringify(payload)).not.toContain(VISA.number)
  })

  it('refuses a real card number before anything is sent', () => {
    const { errors, payload } = validateCardForm({ ...filled, number: '4111 1111 1111 1111' }, NOW)
    expect(payload).toBeUndefined()
    expect(errors.number).toMatch(/only the test cards/i)
    expect(cardNumberHint('4111 1111 1111 1111')).toMatch(/Not a test card/)
  })

  it('catches mistyped numbers, past expiry dates and missing details', () => {
    expect(validateCardForm({ ...filled, number: '4084 0840 8408 4082' }, NOW).errors.number).toMatch(/isn’t valid/)
    expect(validateCardForm({ ...filled, expiry: '01/24' }, NOW).errors.expiry).toMatch(/expired/)
    expect(validateCardForm({ ...filled, expiry: '1324' }, NOW).errors.expiry).toBeDefined()
    expect(validateCardForm({ ...filled, cvc: '1' }, NOW).errors.cvc).toBeDefined()
    expect(validateCardForm({ ...filled, name: ' ' }, NOW).errors.name).toBeDefined()
  })
})

describe('mobile money form', () => {
  it('needs a mobile number and a network', () => {
    expect(validateMomoForm({ network: 'MTN MoMo', phone: '024 123 4567' }).payload)
      .toEqual({ network: 'MTN MoMo', phone: '+233241234567' })
    expect(validateMomoForm({ network: '', phone: '024 123 4567' }).errors.network).toBeDefined()
    // A landline can't hold a wallet
    expect(validateMomoForm({ network: 'MTN MoMo', phone: '030 212 3456' }).errors.phone).toBeDefined()
  })

  it('guesses the network from the number', () => {
    expect(guessMomoNetwork('0241234567')).toBe('MTN MoMo')
    expect(guessMomoNetwork('+233 20 123 4567')).toBe('Telecel Cash')
    expect(guessMomoNetwork('0561234567')).toBe('AT Money')
    expect(guessMomoNetwork('0302123456')).toBeNull()
    expect(normalizeMomoNumber('0302123456')).toBeNull()
  })

  it('labels saved methods without revealing the full number', () => {
    expect(maskPhone('+233241234567')).toBe('024 ••• 4567')
    expect(paymentMethodLabel({ kind: 'card', brand: 'visa', last4: '4081', momo_network: null, momo_phone: null })).toBe('Visa •••• 4081')
    expect(paymentMethodLabel({ kind: 'momo', brand: null, last4: '4567', momo_network: 'MTN MoMo', momo_phone: '+233241234567' })).toBe('MTN MoMo •••• 4567')
    expect(formatExpiry(8, 2029)).toBe('08/29')
  })
})

// ─── The test payment ─────────────────────────────────────────────────────────

describe('test payment decisions', () => {
  const card = (id: string, extra: Record<string, unknown> = {}) => {
    const c = TEST_CARDS.find(x => x.id === id)!
    return { test_card_id: id, last4: c.number.slice(-4), exp_month: 12, exp_year: 2029, ...extra }
  }

  it('approves the approved test cards', () => {
    expect(decideNewCard(card('visa-approved'), NOW)).toEqual({ result: 'approved', channel: 'card', label: 'Visa •••• 4081' })
    expect(decideNewCard(card('mastercard-approved'), NOW).result).toBe('approved')
  })

  it('asks for a one-time code, rejects a wrong one, accepts the right one', () => {
    expect(decideNewCard(card(OTP_CARD.id), NOW).result).toBe('otp_required')
    const wrong = decideNewCard(card(OTP_CARD.id, { otp: '000000' }), NOW)
    expect(wrong).toMatchObject({ result: 'otp_required', retry: true })
    expect(decideNewCard(card(OTP_CARD.id, { otp: TEST_OTP }), NOW).result).toBe('approved')
  })

  it('declines with a reason the buyer understands', () => {
    expect(decideNewCard(card('visa-declined'), NOW)).toMatchObject({ result: 'declined', reason: expect.stringMatching(/bank declined/) })
    expect(decideNewCard(card('visa-insufficient'), NOW)).toMatchObject({ result: 'declined', reason: expect.stringMatching(/enough money/) })
  })

  it('refuses unknown cards, mismatched digits and expired cards', () => {
    expect(decideNewCard({ test_card_id: 'nope', last4: '1111', exp_month: 12, exp_year: 2029 }, NOW).result).toBe('declined')
    expect(decideNewCard(card('visa-approved', { last4: '1111' }), NOW).result).toBe('declined')
    expect(decideNewCard(card('visa-approved', { exp_month: 1, exp_year: 2025 }), NOW)).toMatchObject({ reason: expect.stringMatching(/expired/) })
  })

  it('mobile money follows the answer on the phone', () => {
    expect(decideMomo({ network: 'MTN MoMo', phone: '0241234567', approved: true })).toEqual({ result: 'approved', channel: 'mobile_money', label: 'MTN MoMo •••• 4567' })
    expect(decideMomo({ network: 'MTN MoMo', phone: '0241234567', approved: false }).result).toBe('declined')
  })

  it('a saved card behaves like the test card it came from', () => {
    const saved = { kind: 'card' as const, brand: 'mastercard' as const, last4: OTP_CARD.number.slice(-4), exp_month: 12, exp_year: 2029, momo_network: null, momo_phone: null }
    expect(decideSavedMethod(saved, {}, NOW).result).toBe('otp_required')
    expect(decideSavedMethod(saved, { otp: TEST_OTP }, NOW).result).toBe('approved')
    const momo = { kind: 'momo' as const, brand: null, last4: '4567', exp_month: null, exp_year: null, momo_network: 'MTN MoMo' as const, momo_phone: '+233241234567' }
    expect(decideSavedMethod(momo, { approved: true }, NOW).result).toBe('approved')
    expect(decideSavedMethod(momo, {}, NOW).result).toBe('declined')
  })
})

// ─── Pricing a cart ───────────────────────────────────────────────────────────

function line(overrides: Partial<PriceableLine> & Pick<PriceableLine, 'product_id' | 'vendor_id' | 'unit_price' | 'quantity'>): PriceableLine {
  return { vendor_name: overrides.vendor_id, title: overrides.product_id, slug: overrides.product_id, image: null, is_demo: true, ...overrides }
}

describe('cart pricing', () => {
  it('charges delivery once per shop, on that shop’s first line', () => {
    const cart = priceCart([
      line({ product_id: 'honey', vendor_id: 'gh', unit_price: 65, quantity: 2 }),
      line({ product_id: 'vegbox', vendor_id: 'adom', unit_price: 120, quantity: 1 }),
      line({ product_id: 'coffee', vendor_id: 'gh', unit_price: 48, quantity: 1 }),
    ])
    expect(cart.shops.map(s => s.vendor_id)).toEqual(['gh', 'adom'])
    expect(cart.lines.map(l => [l.product_id, l.delivery_fee])).toEqual([['honey', DELIVERY_FEE_GHS], ['coffee', 0], ['vegbox', DELIVERY_FEE_GHS]])
    expect(cart.subtotal).toBe(298)
    expect(cart.delivery_total).toBe(2 * DELIVERY_FEE_GHS)
    expect(cart.total).toBe(298 + 2 * DELIVERY_FEE_GHS)
    expect(cart.item_count).toBe(4)
    expect(cart.shops[0].total).toBe(178 + DELIVERY_FEE_GHS)
  })

  it('rounds to pesewas', () => {
    const cart = priceCart([line({ product_id: 'x', vendor_id: 'v', unit_price: 0.1, quantity: 3 })])
    expect(cart.subtotal).toBe(0.3)
  })

  it('tells sample, real and mixed carts apart', () => {
    expect(cartKind([])).toBe('empty')
    expect(cartKind([{ is_demo: true }])).toBe('sample')
    expect(cartKind([{ is_demo: false }])).toBe('live')
    expect(cartKind([{ is_demo: true }, { is_demo: false }])).toBe('mixed')
  })
})

describe('checking a cart against the catalogue', () => {
  const product = (overrides: Partial<CatalogueProduct> = {}): CatalogueProduct => ({
    id: 'p1', slug: 'p1', title: 'Raw Honey', images: ['/h.jpg'], unit: 'per jar', price_ghs: 65,
    stock_quantity: 5, minimum_order: 1, status: 'approved', is_demo: true,
    vendor: { id: 'v1', business_name: 'GreenHarvest', slug: 'gh', status: 'approved', user_id: null },
    ...overrides,
  })

  it('accepts an available product within stock', () => {
    expect(lineProblem('p1', 2, product(), 'buyer')).toBeNull()
  })

  it('explains why a line can’t be bought', () => {
    expect(lineProblem('p1', 1, undefined)?.issue).toBe('unavailable')
    expect(lineProblem('p1', 1, product({ status: 'paused' }))?.issue).toBe('unavailable')
    expect(lineProblem('p1', 1, product({ vendor: { id: 'v1', business_name: 'X', status: 'suspended' } }))?.issue).toBe('unavailable')
    expect(lineProblem('p1', 1, product({ stock_quantity: 0 }))?.issue).toBe('out_of_stock')
    expect(lineProblem('p1', 9, product())).toMatchObject({ issue: 'not_enough_stock', available: 5 })
    expect(lineProblem('p1', 1, product({ minimum_order: 3 }))).toMatchObject({ issue: 'below_minimum', minimum: 3 })
  })

  it('stops a vendor buying from their own shop', () => {
    const own = product({ is_demo: false, vendor: { id: 'v1', business_name: 'Mine', status: 'approved', user_id: 'u1' } })
    expect(lineProblem('p1', 1, own, 'u1')?.issue).toBe('own_product')
    expect(lineProblem('p1', 1, own, 'u2')).toBeNull()
  })

  it('prices from the database, whatever the browser thought the price was', () => {
    const products = new Map([['p1', product({ price_ghs: 70 })]])
    const { cart, problems } = priceFromCatalogue([{ product_id: 'p1', quantity: 2 }], products, 'buyer')
    expect(problems).toEqual([])
    expect(cart.subtotal).toBe(140)
    expect(checkoutItems(cart)[0]).toMatchObject({ product_id: 'p1', vendor_id: 'v1', unit_price: 70, subtotal: 140, delivery_fee: DELIVERY_FEE_GHS, total: 140 + DELIVERY_FEE_GHS })
  })

  it('merges a product listed twice', () => {
    expect(mergeLines([{ product_id: 'a', quantity: 1 }, { product_id: 'b', quantity: 2 }, { product_id: 'a', quantity: 3 }]))
      .toEqual([{ product_id: 'a', quantity: 4 }, { product_id: 'b', quantity: 2 }])
  })
})

// ─── Request validation ───────────────────────────────────────────────────────

describe('checkout requests', () => {
  const uuid = '00000000-0000-4000-8000-000000000001'

  it('accepts a saved address or a new one', () => {
    expect(createCheckoutSchema.safeParse({ items: [{ product_id: uuid, quantity: 1 }], delivery: { address_id: uuid } }).success).toBe(true)
    expect(createCheckoutSchema.safeParse({
      items: [{ product_id: uuid, quantity: 1 }],
      delivery: { phone: '024 123 4567', region: 'Greater Accra', address: 'House 12, Osu', save: true },
    }).success).toBe(true)
    expect(createCheckoutSchema.safeParse({
      items: [{ product_id: uuid, quantity: 1 }],
      delivery: { phone: '12345', region: 'Greater Accra', address: 'House 12, Osu' },
    }).success).toBe(false)
  })

  it('rejects an empty cart and non-product ids', () => {
    expect(createCheckoutSchema.safeParse({ items: [], delivery: { address_id: uuid } }).success).toBe(false)
    expect(createCheckoutSchema.safeParse({ items: [{ product_id: 'demo-p-honey', quantity: 1 }], delivery: { address_id: uuid } }).success).toBe(false)
  })

  it('never carries a full card number to the server', () => {
    const parsed = payCheckoutSchema.parse({
      method: 'card', test_card_id: VISA.id, last4: '4081', exp_month: 12, exp_year: 2029,
      holder_name: 'Ama', number: VISA.number, cvc: '123',
    })
    expect(parsed).not.toHaveProperty('number')
    expect(parsed).not.toHaveProperty('cvc')
  })

  it('needs the phone’s answer for a new mobile money payment', () => {
    expect(payCheckoutSchema.safeParse({ method: 'momo', network: 'MTN MoMo', phone: '0241234567' }).success).toBe(false)
    expect(payCheckoutSchema.safeParse({ method: 'momo', network: 'MTN MoMo', phone: '0241234567', approved: true }).success).toBe(true)
  })
})

describe('sign-in redirects', () => {
  it('only sends people to pages on this site', () => {
    expect(safeRedirect('/checkout')).toBe('/checkout')
    expect(safeRedirect('//evil.example')).toBeNull()
    expect(safeRedirect('/\\evil.example')).toBeNull()
    expect(safeRedirect('https://evil.example')).toBeNull()
    expect(safeRedirect(null)).toBeNull()
  })
})

describe('the page to return to after Google sign-in', () => {
  it('reads back only paths on this site', async () => {
    const { readAuthNext } = await import('@/lib/auth/next-cookie')
    expect(readAuthNext(encodeURIComponent('/checkout'))).toBe('/checkout')
    expect(readAuthNext(encodeURIComponent('/buyer/orders/abc?x=1'))).toBe('/buyer/orders/abc?x=1')
    expect(readAuthNext(encodeURIComponent('https://evil.example'))).toBeNull()
    expect(readAuthNext(encodeURIComponent('//evil.example'))).toBeNull()
    expect(readAuthNext('%E0%A4%A')).toBeNull()
    expect(readAuthNext(undefined)).toBeNull()
  })
})
