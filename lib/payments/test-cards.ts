// ─── Test cards for the built-in test payment ─────────────────────────────────
//
// Sample products are paid with a simulated payment so the whole journey can
// be shown without moving money. The card form accepts ONLY these numbers: a
// real card is refused in the browser before anything is sent, and the full
// number never leaves the page. The server receives the test card's id plus
// the last 4 digits and expiry, which is all a saved card ever stores.
//
// The numbers follow the conventions payment providers publish for testing
// (Paystack's 4084 0840 8408 4081 is the standard "approved" Visa), and all
// pass the Luhn check a real card number must pass.

export type CardBrand = 'visa' | 'mastercard' | 'verve'

export type TestCardOutcome = 'approved' | 'otp' | 'declined' | 'insufficient_funds'

export interface TestCard {
  id: string
  number: string // digits only
  brand: CardBrand
  outcome: TestCardOutcome
  /** What paying with it shows, for the test card picker */
  description: string
}

/** The one-time code the "otp" card asks for */
export const TEST_OTP = '123456'

export const TEST_CARDS: TestCard[] = [
  { id: 'visa-approved',       number: '4084084084084081', brand: 'visa',       outcome: 'approved',           description: 'Payment approved' },
  { id: 'mastercard-approved', number: '5555555555554444', brand: 'mastercard', outcome: 'approved',           description: 'Payment approved' },
  { id: 'mastercard-otp',      number: '5531886652142950', brand: 'mastercard', outcome: 'otp',                description: `Asks for a one-time code (${TEST_OTP}), then approved` },
  { id: 'visa-declined',       number: '4084080000005408', brand: 'visa',       outcome: 'declined',           description: 'Declined by the bank' },
  { id: 'visa-insufficient',   number: '4000000000009995', brand: 'visa',       outcome: 'insufficient_funds', description: 'Declined: insufficient funds' },
]

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa:       'Visa',
  mastercard: 'Mastercard',
  verve:      'Verve',
}

export function digitsOnly(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '')
}

/** The checksum every real card number passes */
export function luhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** Whether the first `length` digits fall within [low, high] */
function prefixIn(digits: string, length: number, low: number, high: number): boolean {
  if (digits.length < length) return false
  const prefix = Number(digits.slice(0, length))
  return prefix >= low && prefix <= high
}

/** Card network from the leading digits (Verve needs six digits to tell) */
export function detectBrand(digits: string): CardBrand | null {
  if (digits.startsWith('4')) return 'visa'
  if (prefixIn(digits, 6, 506099, 506198) || prefixIn(digits, 6, 507865, 507964) || prefixIn(digits, 6, 650002, 650027)) {
    return 'verve'
  }
  if (prefixIn(digits, 2, 51, 55) || prefixIn(digits, 4, 2221, 2720)) return 'mastercard'
  return null
}

/** "4084084084084081" -> "4084 0840 8408 4081" (19-digit Verve numbers keep a short last group) */
export function formatCardNumber(input: string): string {
  return digitsOnly(input).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function findTestCard(digits: string): TestCard | undefined {
  return TEST_CARDS.find(card => card.number === digits)
}

export function testCardById(id: string | null | undefined): TestCard | undefined {
  return TEST_CARDS.find(card => card.id === id)
}

/**
 * The test card a saved card came from, so paying with it again behaves the
 * same way (the OTP card still asks for its code).
 */
export function testCardForSaved(brand: string | null | undefined, last4: string): TestCard | undefined {
  return TEST_CARDS.find(card => card.brand === brand && card.number.endsWith(last4))
}

/** "08/29", "8/29", "08/2029" -> { month: 8, year: 2029 } */
export function parseExpiry(input: string): { month: number; year: number } | null {
  const match = input.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/)
  if (!match) return null
  const month = Number(match[1])
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2])
  if (month < 1 || month > 12) return null
  return { month, year }
}

/** A card is valid through the last day of its expiry month */
export function isExpired(month: number, year: number, now: Date = new Date()): boolean {
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  return year < thisYear || (year === thisYear && month < thisMonth)
}

/** Typing helper for the expiry field: "082" -> "08/2", "1" -> "1" */
export function formatExpiryInput(input: string): string {
  const digits = digitsOnly(input).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}
