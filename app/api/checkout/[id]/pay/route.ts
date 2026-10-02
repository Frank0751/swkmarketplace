import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { payCheckoutSchema } from '@/lib/checkout/schema'
import { fulfilCheckout, loadCartProducts } from '@/lib/checkout/server'
import { savePaymentMethod, SavedLimitError } from '@/lib/checkout/saved'
import { lineProblem } from '@/lib/cart/pricing'
import { decideMomo, decideNewCard, decideSavedMethod, type DemoDecision } from '@/lib/payments/demo'
import { testCardById } from '@/lib/payments/test-cards'
import { normalizeMomoNumber } from '@/lib/payments/methods'
import { firstIssue } from '@/lib/marketplace/listing'
import { initializePayment, paymentsMode } from '@/lib/paystack/client'
import { expectedPesewas } from '@/lib/paystack/confirm'
import type { Checkout, PaymentMethod } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

/** Sample payments per buyer per hour, so a script can't flood the demo or the email quota */
const SAMPLE_PAYMENTS_PER_HOUR = 20

// POST /api/checkout/[id]/pay
//
// Sample products: the test payment decides right here, the way a card network
// or mobile money provider would (approved, a one-time code, or declined with a
// reason). Approved creates the orders. No money moves.
//
// Real products: opens a Paystack payment for the checkout total and returns
// its URL. The orders are created when Paystack confirms (webhook, or the
// buyer returning to the success page).
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to pay', code: 'auth_required' }, { status: 401 })
    }

    const parsed = payCheckoutSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    const admin = await createAdminClient()
    const { data: row } = await admin
      .from('checkouts')
      .select('*')
      .eq('id', params.id)
      .eq('buyer_id', user.id)
      .maybeSingle()
    const checkout = row as Checkout | null

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })
    }
    if (checkout.status === 'paid') {
      return NextResponse.json({ status: 'paid', checkout_id: checkout.id, reference: checkout.reference })
    }
    if (checkout.status !== 'pending') {
      return NextResponse.json(
        { error: 'This checkout was closed. Go back to your cart to start again.', code: 'checkout_closed' },
        { status: 409 },
      )
    }

    // Stock can move between opening checkout and paying
    const products = await loadCartProducts(supabase, checkout.items.map(i => i.product_id))
    const problems = checkout.items
      .map(i => lineProblem(i.product_id, i.quantity, products.get(i.product_id), user.id, i.title))
      .filter((p): p is NonNullable<typeof p> => p !== null)
    if (problems.length > 0) {
      return NextResponse.json(
        { error: `${problems[0].message} Nothing was charged. Update your cart and try again.`, code: 'cart_changed', problems },
        { status: 409 },
      )
    }

    if (checkout.is_demo) {
      return payWithTestPayment(admin, user.id, checkout, input)
    }

    // ── Real products: Paystack ────────────────────────────────────────────
    if (input.method !== 'paystack') {
      return NextResponse.json(
        { error: 'Real products are paid securely through Paystack.' },
        { status: 400 },
      )
    }
    if (paymentsMode() === 'off') {
      return NextResponse.json(
        { error: 'Online payment isn’t switched on yet. Please check back soon.', code: 'payments_unavailable' },
        { status: 503 },
      )
    }

    const { data: buyer } = await supabase.from('users').select('email').eq('id', user.id).single()
    if (!buyer?.email) {
      return NextResponse.json({ error: 'Your account has no email address for the receipt' }, { status: 400 })
    }

    const payment = await initializePayment({
      email: buyer.email,
      amount: expectedPesewas(checkout.total_amount),
      metadata: { checkout_id: checkout.id, reference: checkout.reference, buyer_id: user.id },
      callback_url: `${APP_URL}/checkout/success/${checkout.id}`,
      channels: [input.channel],
    })

    await admin
      .from('checkouts')
      .update({ paystack_reference: payment.reference, attempts: checkout.attempts + 1 })
      .eq('id', checkout.id)
      .eq('status', 'pending')

    return NextResponse.json({ status: 'redirect', payment_url: payment.authorization_url })
  } catch (err) {
    console.error('[POST /api/checkout/[id]/pay]', err)
    return NextResponse.json(
      { error: 'Something went wrong while paying. Nothing was charged; please try again.' },
      { status: 500 },
    )
  }
}

async function payWithTestPayment(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  checkout: Checkout,
  input: ReturnType<typeof payCheckoutSchema.parse>,
) {
  if (input.method === 'paystack') {
    return NextResponse.json(
      { error: 'Sample products are paid with the test payment. Choose a test card or mobile money.' },
      { status: 400 },
    )
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('checkouts')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', userId)
    .eq('is_demo', true)
    .eq('status', 'paid')
    .gte('paid_at', since)
  if ((count ?? 0) >= SAMPLE_PAYMENTS_PER_HOUR) {
    return NextResponse.json(
      { error: 'You’ve placed a lot of sample orders in the last hour. Please try again a little later.' },
      { status: 429 },
    )
  }

  let decision: DemoDecision
  if (input.method === 'saved') {
    const { data: method } = await admin
      .from('payment_methods')
      .select('*')
      .eq('id', input.payment_method_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!method) {
      return NextResponse.json({ error: 'That saved payment method was removed. Choose another.' }, { status: 404 })
    }
    if ((method as PaymentMethod).provider !== 'demo') {
      return NextResponse.json({ error: 'This card is for real purchases. Use a test card for sample orders.' }, { status: 400 })
    }
    decision = decideSavedMethod(method as PaymentMethod, { otp: input.otp, approved: input.approved })
  } else if (input.method === 'card') {
    decision = decideNewCard(input)
  } else {
    decision = decideMomo(input)
  }

  if (decision.result === 'otp_required') {
    return NextResponse.json({ status: 'otp_required', message: decision.message, retry: !!decision.retry })
  }

  if (decision.result === 'declined') {
    await admin
      .from('checkouts')
      .update({ attempts: checkout.attempts + 1, last_error: decision.reason })
      .eq('id', checkout.id)
    return NextResponse.json({ status: 'declined', error: decision.reason }, { status: 402 })
  }

  // Approved. Save the method first if asked, the way a gateway tokenises a
  // card as part of a successful payment.
  let savedNote: string | undefined
  if (input.method !== 'saved' && input.save) {
    try {
      if (input.method === 'card') {
        const card = testCardById(input.test_card_id)
        if (card) {
          await savePaymentMethod(admin, userId, {
            kind: 'card', brand: card.brand, last4: input.last4,
            exp_month: input.exp_month, exp_year: input.exp_year, holder_name: input.holder_name,
          })
        }
      } else {
        await savePaymentMethod(admin, userId, {
          kind: 'momo', momo_network: input.network, momo_phone: normalizeMomoNumber(input.phone) as string,
        })
      }
    } catch (err) {
      if (err instanceof SavedLimitError) savedNote = err.message
      else console.error('[Checkout] save payment method:', err)
    }
  }

  const result = await fulfilCheckout(admin, checkout.id, { channel: decision.channel, label: decision.label })

  if (result.outcome === 'paid' || result.outcome === 'already_paid') {
    return NextResponse.json({
      status: 'paid',
      checkout_id: checkout.id,
      reference: checkout.reference,
      order_ids: result.order_ids ?? [],
      note: savedNote,
    })
  }

  return NextResponse.json(
    { error: 'This checkout was closed. Go back to your cart to start again.', code: 'checkout_closed' },
    { status: 409 },
  )
}
