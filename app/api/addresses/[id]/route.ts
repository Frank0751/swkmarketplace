import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { promoteNewestDefault, setDefault } from '@/lib/checkout/saved'

const patchSchema = z.object({ is_default: z.literal(true) })

async function ownAddress(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, address: null }
  // RLS returns only the caller's own addresses
  const { data: address } = await supabase.from('buyer_addresses').select('id, is_default').eq('id', id).maybeSingle()
  return { user, address }
}

// PATCH /api/addresses/[id] { is_default: true }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, address } = await ownAddress(params.id)
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    if (!address) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    await setDefault(await createAdminClient(), 'buyer_addresses', user.id, params.id)
    return NextResponse.json({ status: 'updated' })
  } catch (err) {
    console.error('[PATCH /api/addresses/[id]]', err)
    return NextResponse.json({ error: 'Could not update this address' }, { status: 500 })
  }
}

// DELETE /api/addresses/[id]
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, address } = await ownAddress(params.id)
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    if (!address) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    const admin = await createAdminClient()
    const { error } = await admin.from('buyer_addresses').delete().eq('id', params.id).eq('user_id', user.id)
    if (error) throw error
    if (address.is_default) await promoteNewestDefault(admin, 'buyer_addresses', user.id)
    return NextResponse.json({ status: 'removed' })
  } catch (err) {
    console.error('[DELETE /api/addresses/[id]]', err)
    return NextResponse.json({ error: 'Could not remove this address' }, { status: 500 })
  }
}
