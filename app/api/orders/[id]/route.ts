import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canTransition, type OrderActor } from '@/lib/marketplace/orders'
import { firstIssue } from '@/lib/marketplace/listing'
import { notifyTransition } from '@/lib/orders/notify'
import { ORDER_STATUS_LABELS } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const ORDER_STATUSES = [
  'pending', 'paid', 'confirmed', 'dispatched',
  'delivered', 'released', 'disputed', 'refunded', 'cancelled',
] as const

/**
 * Which side of this order the signed-in user is on. Decided per order rather
 * than per account role: a vendor who buys from another vendor is the buyer on
 * that order, and previously couldn't confirm its delivery.
 */
function actorFor(
  order: { buyer_id: string; vendor?: unknown },
  userId: string,
  role: string | undefined,
): OrderActor | null {
  if (role === 'admin') return 'admin'
  if (order.buyer_id === userId) return 'buyer'
  if ((order.vendor as { user_id?: string } | null)?.user_id === userId) return 'vendor'
  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
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

    if (!actorFor(order, user.id, profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: order })
  } catch (err) {
    console.error('[GET /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

const patchSchema = z.object({
  status:             z.enum(ORDER_STATUSES).optional(),
  note:               z.string().trim().max(1000).optional(),
  vendor_notes:       z.string().trim().max(1000).optional(),
  admin_notes:        z.string().trim().max(2000).optional(),
  estimated_delivery: z.string().trim().max(100).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, buyer_id, vendor:vendor_profiles(user_id)')
      .eq('id', params.id)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const actor = actorFor(order, user.id, profile?.role)
    if (!actor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const { status: next, note, vendor_notes, admin_notes, estimated_delivery } = parsed.data
    const current = order.status as OrderStatus
    const changingStatus = !!next && next !== current

    if (changingStatus && !canTransition(actor, current, next)) {
      return NextResponse.json(
        {
          error: `An order that is "${ORDER_STATUS_LABELS[current] ?? current}" can’t be moved to "${ORDER_STATUS_LABELS[next] ?? next}" from here.`,
        },
        { status: 400 },
      )
    }

    if (next === 'disputed' && actor === 'buyer' && (note ?? '').length < 10) {
      return NextResponse.json(
        { error: 'Please tell us what went wrong so we can help.' },
        { status: 400 },
      )
    }

    if (admin_notes !== undefined && actor !== 'admin') {
      return NextResponse.json({ error: 'Only SWK Ghana can write admin notes' }, { status: 403 })
    }

    if ((vendor_notes !== undefined || estimated_delivery !== undefined) && actor === 'buyer') {
      return NextResponse.json({ error: 'Only the vendor can update delivery details' }, { status: 403 })
    }

    const payload: Record<string, unknown> = {}
    if (changingStatus) payload.status = next
    if (vendor_notes !== undefined) payload.vendor_notes = vendor_notes || null
    if (admin_notes !== undefined) payload.admin_notes = admin_notes || null
    if (estimated_delivery !== undefined) payload.estimated_delivery = estimated_delivery || null

    const now = new Date().toISOString()
    if (changingStatus && next === 'dispatched') payload.dispatched_at = now
    if (changingStatus && next === 'delivered') payload.delivered_at = now

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const admin = await createAdminClient()

    // Guarded on the status we checked, so two people acting at once can't both win
    const { data: updated, error: updateError } = await admin
      .from('orders')
      .update(payload)
      .eq('id', params.id)
      .eq('status', current)
      .select()
      .maybeSingle()

    if (updateError) throw updateError
    if (!updated) {
      return NextResponse.json(
        { error: 'This order was just updated by someone else. Refresh to see its latest status.' },
        { status: 409 },
      )
    }

    if (changingStatus) {
      // The orders_log_status trigger records every status change; add a row
      // only when there is a note to keep with it (e.g. a buyer's problem report)
      if (note) {
        const { error: historyError } = await admin
          .from('order_history')
          .insert({ order_id: params.id, status: next, note, created_by: user.id })
        if (historyError) console.error('[Order history insert]', historyError)
      }

      if (next === 'delivered') {
        const { error: payoutError } = await admin
          .from('payouts')
          .update({ status: 'pending_release' })
          .eq('order_id', params.id)
          .eq('status', 'held')
        if (payoutError) console.error('[Payout pending_release]', payoutError)
      }

      await notifyTransition(admin, params.id, next as OrderStatus, note)
    }

    return NextResponse.json({ data: updated, message: 'Order updated' })
  } catch (err) {
    console.error('[PATCH /api/orders/[id]]', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
