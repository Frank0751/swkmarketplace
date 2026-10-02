import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createCheckoutSchema } from '@/lib/checkout/schema'
import {
  checkoutItems,
  loadCartProducts,
  mergeLines,
  priceFromCatalogue,
} from '@/lib/checkout/server'
import { saveBuyerAddress, SavedLimitError } from '@/lib/checkout/saved'
import { firstIssue } from '@/lib/marketplace/listing'
import { normalizeGhanaPhone } from '@/lib/marketplace/phone'
import { paymentsMode } from '@/lib/paystack/client'
import type { GhanaRegion } from '@/types'

// POST /api/checkout: price the cart from the database and open a checkout.
// Nothing is charged and no order exists yet; the buyer pays next, through
// /api/checkout/[id]/pay, and the orders are created when that succeeds.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to check out', code: 'auth_required' },
        { status: 401 },
      )
    }

    const parsed = createCheckoutSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data
    const items = mergeLines(input.items)

    // Prices, stock and availability come from the database, never the browser
    const products = await loadCartProducts(supabase, items.map(i => i.product_id))
    const { cart, problems } = priceFromCatalogue(items, products, user.id)

    if (problems.length > 0) {
      return NextResponse.json(
        { error: problems[0].message, code: 'cart_changed', problems },
        { status: 409 },
      )
    }

    if (cart.kind === 'mixed') {
      return NextResponse.json(
        {
          error: 'Sample products are paid with a test payment and real products with Paystack, so they can’t be checked out together. Remove the sample items or buy them on their own.',
          code: 'mixed_cart',
        },
        { status: 400 },
      )
    }

    if (cart.kind === 'live' && paymentsMode() === 'off') {
      return NextResponse.json(
        { error: 'Online payment isn’t switched on yet. Please check back soon.', code: 'payments_unavailable' },
        { status: 503 },
      )
    }

    // The buyer agreed to the total they were shown; if prices moved since,
    // show them the new total rather than charging something else
    if (input.expected_total !== undefined && Math.abs(input.expected_total - cart.total) > 0.005) {
      return NextResponse.json(
        {
          error: 'Prices changed while you were checking out. Please check the new total.',
          code: 'price_changed',
          total: cart.total,
        },
        { status: 409 },
      )
    }

    const admin = await createAdminClient()

    let delivery: { phone: string; region: GhanaRegion; address: string }
    if ('address_id' in input.delivery) {
      const { data: saved } = await supabase
        .from('buyer_addresses')
        .select('phone, region, address')
        .eq('id', input.delivery.address_id)
        .maybeSingle()
      if (!saved) {
        return NextResponse.json(
          { error: 'That saved address no longer exists. Choose another or add a new one.' },
          { status: 400 },
        )
      }
      delivery = saved as typeof delivery
    } else {
      delivery = {
        phone:   normalizeGhanaPhone(input.delivery.phone) as string,
        region:  input.delivery.region,
        address: input.delivery.address,
      }
      if (input.delivery.save) {
        try {
          await saveBuyerAddress(admin, user.id, { ...delivery, label: input.delivery.label })
        } catch (err) {
          // A full address book shouldn't stop the purchase
          if (!(err instanceof SavedLimitError)) console.error('[Checkout] save address:', err)
        }
      }
    }

    // A buyer who goes back and changes something gets a fresh checkout; the
    // unpaid one it replaces is closed so it can't be paid by accident
    if (input.replaces) {
      await admin
        .from('checkouts')
        .update({ status: 'cancelled' })
        .eq('id', input.replaces)
        .eq('buyer_id', user.id)
        .eq('status', 'pending')
    }

    const { data: checkout, error } = await admin
      .from('checkouts')
      .insert({
        buyer_id:         user.id,
        is_demo:          cart.kind === 'sample',
        items:            checkoutItems(cart),
        subtotal:         cart.subtotal,
        delivery_total:   cart.delivery_total,
        total_amount:     cart.total,
        delivery_phone:   delivery.phone,
        delivery_region:  delivery.region,
        delivery_address: delivery.address,
        buyer_notes:      input.notes || null,
      })
      .select('id, reference, total_amount, is_demo')
      .single()

    if (error || !checkout) throw error ?? new Error('Checkout insert returned nothing')

    return NextResponse.json({ checkout }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/checkout]', err)
    return NextResponse.json(
      { error: 'We couldn’t start your checkout. Please try again.' },
      { status: 500 },
    )
  }
}
