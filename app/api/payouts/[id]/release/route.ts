import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPayoutReleased } from '@/lib/email/brevo'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    // Fetch payout with related data
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

    if (payout.status === 'released') {
      return NextResponse.json({ error: 'Payout has already been released' }, { status: 400 })
    }

    if (payout.status === 'failed') {
      return NextResponse.json({ error: 'Cannot release a failed payout' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update payout: status = 'released'
    const { data: updatedPayout, error: payoutUpdateError } = await adminSupabase
      .from('payouts')
      .update({
        status:      'released',
        released_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (payoutUpdateError) throw payoutUpdateError

    // Update order: status = 'released'
    const orderId = (payout.order as { id?: string } | null)?.id
    if (orderId) {
      const { error: orderUpdateError } = await adminSupabase
        .from('orders')
        .update({
          status:      'released',
          released_at: now,
        })
        .eq('id', orderId)
      if (orderUpdateError) console.error('[Payout release] Order update failed:', orderUpdateError)
    }

    // Send payout released email to vendor
    const vendorEmail    = (payout.vendor as { user?: { email?: string } } | null)?.user?.email
    const orderReference = (payout.order as { reference?: string } | null)?.reference ?? `PAY-${params.id.slice(0, 8)}`

    if (vendorEmail) {
      sendPayoutReleased(vendorEmail, {
        order_reference: orderReference,
        net_amount:      payout.net_amount,
      }).catch(err => console.error('[Email] payout released:', err))
    }

    // TODO (production): trigger Paystack transfer here
    // await initializeTransfer({ amount: payout.net_amount * 100, recipient: vendorRecipientCode, reason: `Order ${orderReference}` })

    return NextResponse.json({
      success: true,
      payout:  updatedPayout,
      message: `Payout of GHS ${payout.net_amount.toFixed(2)} released to ${(payout.vendor as { business_name?: string } | null)?.business_name ?? 'vendor'}`,
    })
  } catch (err) {
    console.error('[POST /api/payouts/[id]/release]', err)
    return NextResponse.json({ error: 'Failed to release payout' }, { status: 500 })
  }
}
