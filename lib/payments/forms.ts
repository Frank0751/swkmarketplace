import type { MomoNetwork } from '@/types'
import {
  digitsOnly,
  findTestCard,
  isExpired,
  luhnValid,
  parseExpiry,
} from '@/lib/payments/test-cards'
import { MOMO_NETWORK_IDS, normalizeMomoNumber } from '@/lib/payments/methods'

// Validation for the card and mobile money forms (checkout and the payment
// methods page). Pure, so it's unit-tested and the browser never sends a
// request for input that can't succeed.

export interface CardFormValue {
  number: string
  expiry: string
  cvc: string
  name: string
}

export const EMPTY_CARD: CardFormValue = { number: '', expiry: '', cvc: '', name: '' }

/** What the server receives for a new card: never the full number or the security code */
export interface CardPayload {
  test_card_id: string
  last4: string
  exp_month: number
  exp_year: number
  holder_name: string
}

export type CardErrors = Partial<Record<keyof CardFormValue, string>>

export function validateCardForm(
  value: CardFormValue,
  now: Date = new Date(),
): { errors: CardErrors; payload?: CardPayload } {
  const errors: CardErrors = {}
  const digits = digitsOnly(value.number)
  const testCard = findTestCard(digits)

  if (!digits) {
    errors.number = 'Enter the card number'
  } else if (!luhnValid(digits)) {
    errors.number = 'That card number isn’t valid. Check the digits.'
  } else if (!testCard) {
    // A real card typed into the sample checkout is refused right here: it is
    // never sent anywhere
    errors.number = 'Sample orders accept only the test cards listed. Never enter a real card here.'
  }

  const expiry = parseExpiry(value.expiry)
  if (!value.expiry.trim()) {
    errors.expiry = 'Enter the expiry date'
  } else if (!expiry) {
    errors.expiry = 'Use the format MM/YY'
  } else if (isExpired(expiry.month, expiry.year, now)) {
    errors.expiry = 'This card has expired'
  }

  if (!/^\d{3,4}$/.test(value.cvc.trim())) {
    errors.cvc = 'Enter the 3-digit security code'
  }

  if (value.name.trim().length < 2) {
    errors.name = 'Enter the name on the card'
  }

  if (Object.keys(errors).length > 0 || !testCard || !expiry) return { errors }

  return {
    errors,
    payload: {
      test_card_id: testCard.id,
      last4: digits.slice(-4),
      exp_month: expiry.month,
      exp_year: expiry.year,
      holder_name: value.name.trim(),
    },
  }
}

export interface MomoFormValue {
  network: MomoNetwork | ''
  phone: string
}

export type MomoErrors = Partial<Record<keyof MomoFormValue, string>>

export function validateMomoForm(
  value: MomoFormValue,
): { errors: MomoErrors; payload?: { network: MomoNetwork; phone: string } } {
  const errors: MomoErrors = {}
  if (!value.network || !MOMO_NETWORK_IDS.includes(value.network)) {
    errors.network = 'Choose your mobile money network'
  }
  const phone = normalizeMomoNumber(value.phone)
  if (!phone) {
    errors.phone = 'Enter your mobile money number, e.g. 024 123 4567'
  }
  if (Object.keys(errors).length > 0 || !phone || !value.network) return { errors }
  return { errors, payload: { network: value.network, phone } }
}

/** "4084 0840 8408 4081" style partial input check, for live feedback while typing */
export function cardNumberHint(number: string): string | null {
  const digits = digitsOnly(number)
  if (digits.length < 16) return null
  if (findTestCard(digits)) return null
  if (!luhnValid(digits)) return 'That card number isn’t valid.'
  return 'Not a test card. Sample orders accept only the test cards listed.'
}
