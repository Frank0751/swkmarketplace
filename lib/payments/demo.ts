import type { PaymentMethod } from '@/types'
import {
  TEST_OTP,
  isExpired,
  testCardById,
  testCardForSaved,
  type TestCard,
} from '@/lib/payments/test-cards'
import { cardLabel, momoLabel, normalizeMomoNumber } from '@/lib/payments/methods'

// ─── The test payment ─────────────────────────────────────────────────────────
//
// Decides what a simulated payment does, the way a card network or mobile
// money provider would answer: approved, a one-time code needed, or declined
// with a reason. Used only for sample orders; real products are paid through
// Paystack. Pure, so the API and the tests share it.

export type DemoDecision =
  | { result: 'approved'; channel: 'card' | 'mobile_money'; label: string }
  | { result: 'otp_required'; message: string; retry?: boolean }
  | { result: 'declined'; reason: string }

export interface CardDetails {
  last4: string
  exp_month: number
  exp_year: number
}

const NOT_A_TEST_CARD =
  'Only the test cards shown can be used for sample orders. No real card is ever charged here.'

function decideTestCard(
  card: TestCard | undefined,
  details: CardDetails,
  otp: string | undefined,
  now: Date,
): DemoDecision {
  if (!card || !card.number.endsWith(details.last4)) {
    return { result: 'declined', reason: NOT_A_TEST_CARD }
  }
  if (isExpired(details.exp_month, details.exp_year, now)) {
    return { result: 'declined', reason: 'This card has expired. Check the expiry date or use another card.' }
  }

  switch (card.outcome) {
    case 'approved':
      return { result: 'approved', channel: 'card', label: cardLabel(card.brand, details.last4) }
    case 'otp':
      if (!otp) {
        return {
          result: 'otp_required',
          message: `Your bank sent a one-time code to your phone. For this test card the code is ${TEST_OTP}.`,
        }
      }
      if (otp !== TEST_OTP) {
        return { result: 'otp_required', retry: true, message: 'That code didn’t match. Check it and try again.' }
      }
      return { result: 'approved', channel: 'card', label: cardLabel(card.brand, details.last4) }
    case 'declined':
      return { result: 'declined', reason: 'Your bank declined this payment. Try another card or mobile money.' }
    case 'insufficient_funds':
      return { result: 'declined', reason: 'There isn’t enough money on this card. Try another card or mobile money.' }
  }
}

export function decideNewCard(
  input: CardDetails & { test_card_id: string; otp?: string },
  now: Date = new Date(),
): DemoDecision {
  return decideTestCard(testCardById(input.test_card_id), input, input.otp, now)
}

export function decideMomo(
  input: { network: string; phone: string; approved: boolean },
): DemoDecision {
  const phone = normalizeMomoNumber(input.phone)
  if (!phone) {
    return { result: 'declined', reason: 'Enter a mobile money number, e.g. 024 123 4567.' }
  }
  if (!input.approved) {
    return { result: 'declined', reason: 'The payment was declined on the phone. Nothing was charged.' }
  }
  return { result: 'approved', channel: 'mobile_money', label: momoLabel(input.network, phone) }
}

export function decideSavedMethod(
  method: Pick<PaymentMethod, 'kind' | 'brand' | 'last4' | 'exp_month' | 'exp_year' | 'momo_network' | 'momo_phone'>,
  input: { otp?: string; approved?: boolean },
  now: Date = new Date(),
): DemoDecision {
  if (method.kind === 'momo') {
    return decideMomo({
      network: method.momo_network ?? 'Mobile money',
      phone: method.momo_phone ?? '',
      approved: input.approved === true,
    })
  }

  const details = { last4: method.last4, exp_month: method.exp_month ?? 0, exp_year: method.exp_year ?? 0 }
  // A saved card behaves like the test card it came from (the code card still
  // asks for its code); only approved cards are ever saved
  const card = testCardForSaved(method.brand, method.last4)
  if (!card) {
    if (isExpired(details.exp_month, details.exp_year, now)) {
      return { result: 'declined', reason: 'This card has expired. Remove it and add another.' }
    }
    return { result: 'approved', channel: 'card', label: cardLabel(method.brand, method.last4) }
  }
  return decideTestCard(card, details, input.otp, now)
}
