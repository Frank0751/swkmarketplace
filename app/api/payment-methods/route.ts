import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { addPaymentMethodSchema } from '@/lib/checkout/schema'
import { savePaymentMethod, SavedLimitError } from '@/lib/checkout/saved'
import { decideNewCard } from '@/lib/payments/demo'
import { testCardById } from '@/lib/payments/test-cards'
import { normalizeMomoNumber } from '@/lib/payments/methods'
import { firstIssue } from '@/lib/marketplace/listing'

// POST /api/payment-methods: save a card or mobile money wallet for faster
// checkout. Payments are in test mode (sample shops only), so cards are
// limited to the test cards and are "verified" with the test payment, the way
// a gateway checks a real card with a small refundable charge.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in', code: 'auth_required' }, { status: 401 })
    }

    const parsed = addPaymentMethodSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data
    const admin = await createAdminClient()

    if (input.kind === 'card') {
      const decision = decideNewCard(input)
      if (decision.result === 'otp_required') {
        return NextResponse.json({ status: 'otp_required', message: decision.message, retry: !!decision.retry })
      }
      if (decision.result === 'declined') {
        return NextResponse.json({ status: 'declined', error: decision.reason }, { status: 402 })
      }
      const card = testCardById(input.test_card_id)
      if (!card) {
        return NextResponse.json({ error: 'Only the test cards shown can be saved.' }, { status: 400 })
      }
      const method = await savePaymentMethod(admin, user.id, {
        kind: 'card', brand: card.brand, last4: input.last4,
        exp_month: input.exp_month, exp_year: input.exp_year, holder_name: input.holder_name,
      }, { makeDefault: input.make_default })
      return NextResponse.json({ status: 'saved', method }, { status: 201 })
    }

    const method = await savePaymentMethod(admin, user.id, {
      kind: 'momo', momo_network: input.network, momo_phone: normalizeMomoNumber(input.phone) as string,
    }, { makeDefault: input.make_default })
    return NextResponse.json({ status: 'saved', method }, { status: 201 })
  } catch (err) {
    if (err instanceof SavedLimitError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/payment-methods]', err)
    return NextResponse.json({ error: 'Could not save this payment method. Please try again.' }, { status: 500 })
  }
}
