import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendOrderDispatched, sendDeliveryConfirmed } from '@/lib/email/brevo'
import type { OrderStatus } from '@/types'

// Valid status transitions by role
const TRANSITIONS: Record<string, Record<OrderStatus, OrderStatus[]>> = {
  vendor: {
    pending:    ['confirmed'],
    paid:       ['confirmed'],
    confirmed:  ['dispatched'],
    dispatched: [],
    delivered:  [],
    released:   [],
    disputed:   [],
    refunded:   [],
    cancelled:  [],
  },
  buyer: {
    pending:    ['cancelled'],
    paid:       [],
    confirmed:  [],
    dispatched: ['delivered'],
    delivered:  [],
    released:   [],
    disputed:   [],
    refunded:   [],
    cancelled:  [],
  },
  admin: {
    pending:    ['paid', 'cancelled'],
    paid:       ['confirmed', 'refunded', 'disputed'],
    confirmed:  ['dispatched', 'disputed'],
    dispatched: ['delivered', 'disputed'],
    delivered:  ['released'],
    released:   [],
    disputed:   ['refunded', 'released'],
    refunded:   [],
    cancelled:  [],
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:users(*),
        vendor:vendor_profiles(*, user:users(*)),
        product:products(*),
        payout:payouts(*)
      `)
      .eq('id', params.id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Access control: buyer or vendor party, or admin
    const role = profile?.role
    if (role !== 'admin') {
      if (role === 'buyer' && order.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (role === 'vendor') {
        // check vendor id
        const { data: vp } = await supabase
          .from('vendor_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()
        if (!vp || order.vendor_id !== vp.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    return NextResponse.json({ data: order })
  } catch (err) {
    console.error('[GET /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role as 'buyer' | 'vendor' | 'admin' | undefined
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch existing order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:users(email, full_name),
        vendor:vendor_profiles(id, business_name, user_id, user:users(email)),
        product:products(title)
      `)
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Access control
    if (role !== 'admin') {
      if (role === 'buyer' && order.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (role === 'vendor') {
        const vendorProfile = order.vendor as { id: string; user_id: string } | null
        if (!vendorProfile || vendorProfile.user_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const body = await request.json()
    const { status: newStatus, note, vendor_notes, admin_notes } = body as {
      status?: OrderStatus
      note?: string
      vendor_notes?: string
      admin_notes?: string
    }

    const currentStatus = order.status as OrderStatus
    const allowedTransitions = TRANSITIONS[role]?.[currentStatus] ?? []

    if (newStatus && !allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Transition from "${currentStatus}" to "${newStatus}" is not allowed for role "${role}"`,
        },
        { status: 400 },
      )
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {}
    if (newStatus) updatePayload.status = newStatus
    if (vendor_notes !== undefined) updatePayload.vendor_notes = vendor_notes
    if (admin_notes  !== undefined) updatePayload.admin_notes  = admin_notes

    // Set timestamps on specific transitions
    if (newStatus === 'dispatched') updatePayload.dispatched_at = new Date().toISOString()
    if (newStatus === 'delivered')  updatePayload.delivered_at  = new Date().toISOString()
    if (newStatus === 'released')   updatePayload.released_at   = new Date().toISOString()

    const adminSupabase = await createAdminClient()

    const { data: updated, error: updateError } = await adminSupabase
      .from('orders')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Status changes are auto-logged to order_history by the orders_log_status
    // trigger — only insert here when there is a note to attach
    if (newStatus && newStatus !== currentStatus) {
      if (note) {
        const { error: historyError } = await adminSupabase
          .from('order_history')
          .insert({
            order_id:   params.id,
            status:     newStatus,
            note,
            created_by: user.id,
          })
        if (historyError) console.error('[Order history insert]', historyError)
      }

      // Send emails for specific transitions
      const buyerEmail  = (order.buyer as { email?: string } | null)?.email
      const vendorEmail = (order.vendor as { user?: { email?: string } } | null)?.user?.email
      const productTitle = (order.product as { title?: string } | null)?.title ?? 'Your product'
      const orderRef    = order.reference

      if (newStatus === 'dispatched' && buyerEmail) {
        sendOrderDispatched(buyerEmail, {
          reference:          orderRef,
          product_title:      productTitle,
          estimated_delivery: order.estimated_delivery,
        }).catch(err => console.error('[Email] dispatched:', err))
      }

      if (newStatus === 'delivered') {
        // Notify vendor that delivery confirmed + payout pending
        if (vendorEmail) {
          // Fetch payout net amount
          const { data: payout } = await adminSupabase
            .from('payouts')
            .select('net_amount')
            .eq('order_id', params.id)
            .single()

          sendDeliveryConfirmed(vendorEmail, {
            reference:  orderRef,
            net_amount: payout?.net_amount ?? 0,
          }).catch(err => console.error('[Email] delivered-vendor:', err))
        }
        // Also update payout to pending_release
        const { error: payoutError } = await adminSupabase
          .from('payouts')
          .update({ status: 'pending_release' })
          .eq('order_id', params.id)
          .eq('status', 'held')
        if (payoutError) console.error('[Payout pending_release]', payoutError)
      }
    }

    return NextResponse.json({ data: updated, message: 'Order updated' })
  } catch (err) {
    console.error('[PATCH /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
