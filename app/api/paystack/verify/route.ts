import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { settleOrderPayment } from '@/lib/paystack/confirm'

// POST /api/paystack/verify: reconcile an order's payment directly with
// Paystack when the buyer returns from the payment page, in case the webhook
// hasn't arrived yet. Uses the same checks as the webhook (amount, currency).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = (await request.json().catch(() => ({}))) as { order_id?: string }
    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, status, paystack_reference')
      .eq('id', order_id)
      .maybeSingle()

    if (!order || order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Already reconciled (the webhook got there first), nothing to do
    if (order.status !== 'pending') {
      return NextResponse.json({ status: order.status, reconciled: false })
    }

    if (!order.paystack_reference) {
      return NextResponse.json({ error: 'Order has no payment reference' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const result = await settleOrderPayment(admin, {
      reference: order.paystack_reference,
      orderId: order.id,
    })

    return NextResponse.json({
      status: result.outcome === 'paid' ? 'paid' : order.status,
      reconciled: result.outcome === 'paid',
      outcome: result.outcome,
    })
  } catch (err) {
    console.error('[POST /api/paystack/verify]', err)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
