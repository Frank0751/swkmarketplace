import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { loadSampleDataStatus } from '@/lib/admin/sample-data'

// Admin controls for the sample shops: see what's there, reset it between
// rehearsals, or hide it before launch. Real shops, products and orders are
// never touched (the database functions only act on is_demo rows).

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  try {
    return NextResponse.json(await loadSampleDataStatus())
  } catch (err) {
    console.error('[GET /api/admin/sample-data]', err)
    return NextResponse.json({ error: 'Could not read the sample data' }, { status: 500 })
  }
}

const schema = z.object({ action: z.enum(['reset', 'hide', 'show']) })

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    let message: string
    if (parsed.data.action === 'reset') {
      const { data, error } = await admin.rpc('reset_sample_data')
      if (error) throw error
      const removed = (data as { orders_removed?: number } | null)?.orders_removed ?? 0
      message = `Sample data reset: ${removed} sample order${removed === 1 ? '' : 's'} removed, stock restored.`
    } else {
      const { error } = await admin.rpc('set_sample_visibility', { p_visible: parsed.data.action === 'show' })
      if (error) throw error
      message = parsed.data.action === 'show'
        ? 'Sample shops are visible again.'
        : 'Sample shops are hidden from the storefront.'
    }
    return NextResponse.json({ message, status: await loadSampleDataStatus() })
  } catch (err) {
    console.error('[POST /api/admin/sample-data]', err)
    return NextResponse.json({ error: 'Could not update the sample data' }, { status: 500 })
  }
}
