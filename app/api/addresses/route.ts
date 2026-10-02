import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { newAddressSchema } from '@/lib/checkout/schema'
import { saveBuyerAddress, SavedLimitError } from '@/lib/checkout/saved'
import { firstIssue } from '@/lib/marketplace/listing'
import { normalizeGhanaPhone } from '@/lib/marketplace/phone'

const addSchema = newAddressSchema.extend({ make_default: z.boolean().optional() })

// POST /api/addresses: save a delivery address for faster checkout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in', code: 'auth_required' }, { status: 401 })
    }

    const parsed = addSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const address = await saveBuyerAddress(await createAdminClient(), user.id, {
      label:       parsed.data.label,
      phone:       normalizeGhanaPhone(parsed.data.phone) as string,
      region:      parsed.data.region,
      address:     parsed.data.address,
      makeDefault: parsed.data.make_default,
    })
    return NextResponse.json({ address }, { status: 201 })
  } catch (err) {
    if (err instanceof SavedLimitError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/addresses]', err)
    return NextResponse.json({ error: 'Could not save this address. Please try again.' }, { status: 500 })
  }
}
