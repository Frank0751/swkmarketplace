import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notifyTransition } from '@/lib/orders/notify'
import { ORDER_STATUS_LABELS } from '@/lib/utils'
import type { OrderStatus } from '@/types'

// POST /api/orders/[id]/simulate { action }
//
// Sample shops have no owner to confirm or dispatch an order, so whoever is
// demonstrating the marketplace can play their part from the order page and
// show the whole journey: vendor confirms, vendor dispatches, buyer confirms
// delivery (the buyer's real button), SWK releases the payout. Works only on
// sample orders, for their buyer or an admin.

const STEPS = {
  confirm: {
    from: 'paid' as OrderStatus,
    to: 'confirmed' as OrderStatus,
    note: 'The sample shop confirmed the order (simulated for a demo).',
  },
  dispatch: {
    from: 'confirmed' as OrderStatus,
    to: 'dispatched' as OrderStatus,
    note: 'The sample shop dispatched the order (simulated for a demo).',
  },
  release: {
    from: 'delivered' as OrderStatus,
    to: 'released' as OrderStatus,
    note: 'SWK Ghana released the payout to the sample shop (simulated: no money was sent).',
  },
}

const schema = z.object({ action: z.enum(['confirm', 'dispatch', 'release']) })

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })

    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    const step = STEPS[parsed.data.action]

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const admin = await createAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, status, buyer_id, is_demo')
      .eq('id', params.id)
      .maybeSingle()

    if (!order || (order.buyer_id !== user.id && profile?.role !== 'admin')) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!order.is_demo) {
      return NextResponse.json(
        { error: 'Only sample orders can be moved along from here. Real orders are updated by their shop.' },
        { status: 400 },
      )
    }
    if (order.status !== step.from) {
      const label = ORDER_STATUS_LABELS[order.status] ?? order.status
      return NextResponse.json(
        { error: `This order is "${label}", so that step doesn’t apply. Refresh to see its latest status.` },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()
    const payload: Record<string, unknown> = { status: step.to }
    if (step.to === 'dispatched') {
      payload.dispatched_at = now
      payload.estimated_delivery = '1 to 2 working days'
    }
    if (step.to === 'released') payload.released_at = now

    const { data: updated, error } = await admin
      .from('orders')
      .update(payload)
      .eq('id', order.id)
      .eq('status', step.from)
      .select('id, status')
      .maybeSingle()
    if (error) throw error
    if (!updated) {
      return NextResponse.json(
        { error: 'This order was just updated. Refresh to see its latest status.' },
        { status: 409 },
      )
    }

    await admin.from('order_history').insert({
      order_id: order.id,
      status: step.to,
      note: step.note,
      created_by: user.id,
    })

    if (step.to === 'released') {
      await admin
        .from('payouts')
        .update({ status: 'released', released_at: now })
        .eq('order_id', order.id)
        .in('status', ['held', 'pending_release'])
    } else {
      await notifyTransition(admin, order.id, step.to)
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[POST /api/orders/[id]/simulate]', err)
    return NextResponse.json({ error: 'Could not update the sample order. Please try again.' }, { status: 500 })
  }
}
