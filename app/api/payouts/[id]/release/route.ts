import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPayoutReleased } from '@/lib/email/brevo'
import { ORDER_STATUS_LABELS } from '@/lib/utils'

// Releasing records that SWK Ghana has sent the vendor their share. The money
// itself is sent by an admin to the vendor's mobile money or bank account
// (shown on the payouts page) until automatic Paystack transfers are set up.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden, admin access required' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data: payout, error: fetchError } = await adminSupabase
      .from('payouts')
      .select(`
        *,
        order:orders(id, reference, status),
        vendor:vendor_profiles(id, business_name, user:users(email, full_name))
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    const order = payout.order as { id?: string; reference?: string; status?: string } | null

    if (payout.status === 'released') {
      return NextResponse.json({ error: 'Payout has already been released' }, { status: 400 })
    }
    if (payout.status === 'cancelled') {
      return NextResponse.json({ error: 'This order was refunded, so its payout is cancelled' }, { status: 400 })
    }
    if (payout.status === 'failed') {
      return NextResponse.json({ error: 'Cannot release a failed payout' }, { status: 400 })
    }

    // Escrow rule: the vendor is paid only once delivery is confirmed (by the
    // buyer, or by SWK Ghana after a dispute or the confirmation window)
    if (payout.status !== 'pending_release' && order?.status !== 'delivered') {
      const label = order?.status ? (ORDER_STATUS_LABELS[order.status] ?? order.status) : 'unknown'
      return NextResponse.json(
        { error: `Release a payout only after delivery is confirmed. This order is "${label}".` },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    const { data: updatedPayout, error: payoutUpdateError } = await adminSupabase
      .from('payouts')
      .update({ status: 'released', released_at: now })
      .eq('id', params.id)
      .eq('status', payout.status)
      .select()
      .maybeSingle()

    if (payoutUpdateError) throw payoutUpdateError
    if (!updatedPayout) {
      return NextResponse.json({ error: 'This payout was just updated. Refresh the page.' }, { status: 409 })
    }

    if (order?.id) {
      const { error: orderUpdateError } = await adminSupabase
        .from('orders')
        .update({ status: 'released', released_at: now })
        .eq('id', order.id)
      if (orderUpdateError) console.error('[Payout release] Order update failed:', orderUpdateError)
    }

    const vendorEmail    = (payout.vendor as { user?: { email?: string } } | null)?.user?.email
    const orderReference = order?.reference ?? `PAY-${params.id.slice(0, 8)}`

    if (vendorEmail) {
      await sendPayoutReleased(vendorEmail, {
        order_reference: orderReference,
        net_amount:      payout.net_amount,
      }).catch(err => console.error('[Email] payout released:', err))
    }

    return NextResponse.json({
      success: true,
      payout:  updatedPayout,
      message: `Payout of GHS ${Number(payout.net_amount).toFixed(2)} released to ${(payout.vendor as { business_name?: string } | null)?.business_name ?? 'vendor'}`,
    })
  } catch (err) {
    console.error('[POST /api/payouts/[id]/release]', err)
    return NextResponse.json({ error: 'Failed to release payout' }, { status: 500 })
  }
}
