import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyPayment } from '@/lib/paystack/client'

// POST /api/paystack/verify, reconcile an order's payment status directly
// with Paystack. Fallback for when the buyer returns via callback_url before
// (or without) the webhook being processed.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = (await request.json()) as { order_id?: string }
    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, status, paystack_reference')
      .eq('id', order_id)
      .single()

    // RLS already limits visibility to order parties; still require the buyer
    if (!order || order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Already reconciled (webhook got there first), nothing to do
    if (order.status !== 'pending') {
      return NextResponse.json({ status: order.status, reconciled: false })
    }

    if (!order.paystack_reference) {
      return NextResponse.json({ error: 'Order has no payment reference' }, { status: 400 })
    }

    const payment = await verifyPayment(order.paystack_reference)

    if (payment.status !== 'success') {
      return NextResponse.json({ status: 'pending', paystack_status: payment.status, reconciled: false })
    }

    // Guard: pending → paid only. The DB trigger creates the payout record.
    const adminSupabase = await createAdminClient()
    const { error: updateError } = await adminSupabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)
      .eq('status', 'pending')

    if (updateError) throw updateError

    return NextResponse.json({ status: 'paid', reconciled: true })
  } catch (err) {
    console.error('[POST /api/paystack/verify]', err)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
