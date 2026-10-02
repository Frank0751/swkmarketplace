import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const limit   = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20))
    const status  = searchParams.get('status')
    const offset  = (page - 1) * limit

    let query = supabase
      .from('orders')
      .select(`
        *,
        buyer:users(*),
        vendor:vendor_profiles(id, business_name, logo_url),
        product:products(id, title, images, slug, price_ghs)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    // Filter by role
    if (profile?.role === 'buyer') {
      query = query.eq('buyer_id', user.id)
    } else if (profile?.role === 'vendor') {
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (vendorProfile) {
        query = query.eq('vendor_id', vendorProfile.id)
      }
    }
    // Admin can see all

    const { data: orders, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: orders,
      count,
      page,
      per_page: limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    console.error('[GET /api/orders]', err)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    )
  }
}

// Orders are created by the cart checkout (POST /api/checkout, then
// /api/checkout/[id]/pay), which prices every item from the database and
// creates the orders only once payment succeeds.
