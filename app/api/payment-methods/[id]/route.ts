import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { promoteNewestDefault, setDefault } from '@/lib/checkout/saved'

const patchSchema = z.object({ is_default: z.literal(true) })

async function ownMethod(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, method: null }
  // RLS returns only the caller's own methods
  const { data: method } = await supabase.from('payment_methods').select('id, is_default').eq('id', id).maybeSingle()
  return { user, method }
}

// PATCH /api/payment-methods/[id] { is_default: true }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, method } = await ownMethod(params.id)
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    if (!method) return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })

    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    await setDefault(await createAdminClient(), 'payment_methods', user.id, params.id)
    return NextResponse.json({ status: 'updated' })
  } catch (err) {
    console.error('[PATCH /api/payment-methods/[id]]', err)
    return NextResponse.json({ error: 'Could not update this payment method' }, { status: 500 })
  }
}

// DELETE /api/payment-methods/[id]
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, method } = await ownMethod(params.id)
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    if (!method) return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })

    const admin = await createAdminClient()
    const { error } = await admin.from('payment_methods').delete().eq('id', params.id).eq('user_id', user.id)
    if (error) throw error
    if (method.is_default) await promoteNewestDefault(admin, 'payment_methods', user.id)
    return NextResponse.json({ status: 'removed' })
  } catch (err) {
    console.error('[DELETE /api/payment-methods/[id]]', err)
    return NextResponse.json({ error: 'Could not remove this payment method' }, { status: 500 })
  }
}
