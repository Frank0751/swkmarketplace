import { z } from 'zod'
import { GHANA_REGIONS, type GhanaRegion } from '@/types'
import { normalizeGhanaPhone } from '@/lib/marketplace/phone'
import { MOMO_NETWORK_IDS, normalizeMomoNumber } from '@/lib/payments/methods'

// Request bodies for the checkout, payment method and address APIs. Shared
// with the browser so both validate the same way.

export const MAX_CART_LINES = 30

const phoneField = z.string().trim().refine(
  value => normalizeGhanaPhone(value) !== null,
  'Enter a Ghana phone number the vendor can call, e.g. 024 123 4567',
)

const regionField = z.enum(GHANA_REGIONS as [GhanaRegion, ...GhanaRegion[]], {
  errorMap: () => ({ message: 'Please select a delivery region' }),
})

export const newAddressSchema = z.object({
  label:   z.string().trim().max(40).optional(),
  phone:   phoneField,
  region:  regionField,
  address: z.string().trim().min(5, 'Please enter a fuller delivery address').max(300),
})

export const createCheckoutSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid('This item can’t be bought any more'),
    quantity:   z.number().int().min(1).max(1000),
  })).min(1, 'Your cart is empty').max(MAX_CART_LINES, `A cart can hold up to ${MAX_CART_LINES} different products`),
  delivery: z.union([
    z.object({ address_id: z.string().uuid() }),
    newAddressSchema.extend({ save: z.boolean().optional() }),
  ]),
  notes:          z.string().trim().max(500).optional(),
  /** The total the buyer was shown; a mismatch means prices moved since */
  expected_total: z.number().nonnegative().optional(),
  /** An earlier unpaid checkout from the same page, cancelled when replaced */
  replaces:       z.string().uuid().optional(),
})

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>

const otpField = z.string().trim().regex(/^\d{4,8}$/, 'Enter the code from your phone').optional()

/** A new test card: never the full number, only which test card and its visible details */
export const newCardSchema = z.object({
  test_card_id: z.string().min(1),
  last4:        z.string().regex(/^\d{4}$/),
  exp_month:    z.number().int().min(1).max(12),
  exp_year:     z.number().int().min(2000).max(2100),
  holder_name:  z.string().trim().min(2, 'Enter the name on the card').max(80),
})

export const newMomoSchema = z.object({
  network: z.enum(MOMO_NETWORK_IDS),
  phone:   z.string().trim().refine(
    value => normalizeMomoNumber(value) !== null,
    'Enter a mobile money number, e.g. 024 123 4567',
  ),
})

export const payCheckoutSchema = z.discriminatedUnion('method', [
  newCardSchema.extend({
    method: z.literal('card'),
    save:   z.boolean().optional(),
    otp:    otpField,
  }),
  newMomoSchema.extend({
    method:   z.literal('momo'),
    save:     z.boolean().optional(),
    /** The buyer's answer to the (simulated) prompt on their phone */
    approved: z.boolean(),
  }),
  z.object({
    method:            z.literal('saved'),
    payment_method_id: z.string().uuid(),
    otp:               otpField,
    approved:          z.boolean().optional(),
  }),
  z.object({
    method:  z.literal('paystack'),
    channel: z.enum(['card', 'mobile_money']),
  }),
])

export type PayCheckoutInput = z.infer<typeof payCheckoutSchema>

export const addPaymentMethodSchema = z.discriminatedUnion('kind', [
  newCardSchema.extend({ kind: z.literal('card'), otp: otpField, make_default: z.boolean().optional() }),
  newMomoSchema.extend({ kind: z.literal('momo'), make_default: z.boolean().optional() }),
])

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>
