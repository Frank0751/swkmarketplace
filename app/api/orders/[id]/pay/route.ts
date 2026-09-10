import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { initializePayment, paymentsMode } from '@/lib/paystack/client'
import { expectedPesewas, settleOrderPayment } from '@/lib/paystack/confirm'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

// POST /api/orders/[id]/pay: a fresh payment page for an order that is still
// unpaid. Before this, a buyer who closed the Paystack page, or whose mobile
// money prompt timed out, had an order they could never pay for.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in', code: 'auth_required' }, { status: 401 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, reference, status, buyer_id, quantity, total_amount, paystack_reference, product:products(status, stock_quantity)')
      .eq('id', params.id)
      .maybeSingle()

    if (!order || order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'This order is no longer waiting for payment', status: order.status },
        { status: 409 },
      )
    }

    const admin = await createAdminClient()

    // The earlier attempt may have gone through without the webhook arriving
    // yet. Check before opening a second payment for the same order.
    if (order.paystack_reference && paymentsMode() !== 'off') {
      try {
        const result = await settleOrderPayment(admin, {
          reference: order.paystack_reference,
          orderId: order.id,
        })
        if (result.outcome === 'paid' || result.outcome === 'already_processed') {
          return NextResponse.json({ status: 'paid' })
        }
      } catch {
        // Unknown or abandoned reference: carry on with a fresh payment
      }
    }

    if (paymentsMode() === 'off') {
      return NextResponse.json(
        { error: 'Online payment isn’t switched on yet. Please check back soon.', code: 'payments_unavailable' },
        { status: 503 },
      )
    }

    const product = order.product as unknown as { status: string; stock_quantity: number } | null
    if (!product || product.status !== 'approved' || product.stock_quantity < order.quantity) {
      return NextResponse.json(
        { error: 'This product is no longer available in that quantity. Cancel this order and choose again.' },
        { status: 409 },
      )
    }

    const { data: buyer } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!buyer?.email) {
      return NextResponse.json({ error: 'Your account has no email address for the receipt' }, { status: 400 })
    }

    const payment = await initializePayment({
      email: buyer.email,
      amount: expectedPesewas(order.total_amount),
      metadata: { order_id: order.id, reference: order.reference, buyer_id: user.id },
      callback_url: `${APP_URL}/buyer/orders/${order.id}?payment=success`,
    })

    await admin
      .from('orders')
      .update({ paystack_reference: payment.reference })
      .eq('id', order.id)
      .eq('status', 'pending')

    return NextResponse.json({ payment_url: payment.authorization_url })
  } catch (err) {
    console.error('[POST /api/orders/[id]/pay]', err)
    return NextResponse.json(
      { error: 'We couldn’t open the payment page. Please try again in a moment.' },
      { status: 502 },
    )
  }
}
