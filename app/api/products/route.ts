import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import type { ProductCategory, GhanaRegion, SDGTag, ValueTag } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category  = searchParams.get('category') as ProductCategory | null
    const search    = searchParams.get('search')
    const sort      = searchParams.get('sort') ?? 'newest'
    const limit     = parseInt(searchParams.get('limit') ?? '20')
    const offset    = parseInt(searchParams.get('offset') ?? '0')
    const region    = searchParams.get('region') as GhanaRegion | null
    const valueTag  = searchParams.get('value_tag')
    const sdgTag    = searchParams.get('sdg_tag')
    const vendorId  = searchParams.get('vendor_id')
    const showAll   = searchParams.get('show_all') === 'true' // admin/vendor use only

    let query = supabase
      .from('products')
      .select('*, vendor:vendor_profiles(id, business_name, logo_url, location, region)', {
        count: 'exact',
      })

    // By default only show approved products publicly
    if (!showAll) {
      query = query.eq('status', 'approved')
    }

    if (category)  query = query.eq('category', category)
    if (region)    query = query.eq('region', region)
    if (vendorId)  query = query.eq('vendor_id', vendorId)
    if (valueTag)  query = query.contains('value_tags', [valueTag])
    if (sdgTag)    query = query.contains('sdg_tags', [sdgTag])

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%`)
    }

    // Sorting
    switch (sort) {
      case 'price_asc':  query = query.order('price_ghs', { ascending: true });  break
      case 'price_desc': query = query.order('price_ghs', { ascending: false }); break
      case 'popular':    query = query.order('order_count', { ascending: false }); break
      case 'oldest':     query = query.order('created_at', { ascending: true });  break
      default:           query = query.order('created_at', { ascending: false }); break
    }

    query = query.range(offset, offset + limit - 1)

    const { data: products, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      data: products,
      count,
      per_page: limit,
      offset,
      total_pages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    console.error('[GET /api/products]', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    if (profile?.role !== 'vendor' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only approved vendors can create listings' }, { status: 403 })
    }

    // Get vendor profile
    const { data: vendorProfile, error: vpError } = await supabase
      .from('vendor_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (vpError || !vendorProfile) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 })
    }

    if (vendorProfile.status !== 'approved' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Your vendor application must be approved before listing products' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      short_description,
      price_ghs,
      category,
      stock_quantity,
      images = [],
      sdg_tags = [],
      value_tags = [],
      location,
      region,
      unit,
      minimum_order,
    } = body as {
      title: string
      description: string
      short_description: string
      price_ghs: number
      category: ProductCategory
      stock_quantity: number
      images: string[]
      sdg_tags: SDGTag[]
      value_tags: ValueTag[]
      location: string
      region: GhanaRegion
      unit?: string
      minimum_order?: number
    }

    if (!title || !description || !short_description || !price_ghs || !category || !stock_quantity) {
      return NextResponse.json(
        { error: 'title, description, short_description, price_ghs, category, and stock_quantity are required' },
        { status: 400 },
      )
    }

    const slug = generateSlug(title)

    const adminSupabase = await createAdminClient()
    const { data: product, error: insertError } = await adminSupabase
      .from('products')
      .insert({
        vendor_id:         vendorProfile.id,
        title,
        slug,
        description,
        short_description,
        price_ghs,
        price:             Math.round(price_ghs * 100), // pesewas
        category,
        stock_quantity,
        images,
        sdg_tags,
        value_tags,
        location:          location ?? '',
        region:            region ?? 'Greater Accra',
        unit:              unit ?? null,
        minimum_order:     minimum_order ?? null,
        status:            'pending_review',
        views:             0,
        order_count:       0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/products] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }

    return NextResponse.json(
      { data: product, message: 'Listing submitted for review' },
      { status: 201 },
    )
  } catch (err) {
    console.error('[POST /api/products]', err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
