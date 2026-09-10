import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, generateSlug } from '@/lib/utils'
import { productSearchFilter } from '@/lib/marketplace/search'
import { listingSchema, firstIssue } from '@/lib/marketplace/listing'
import { sendAdminAlert } from '@/lib/email/brevo'
import { CATEGORY_META, type ProductCategory, type GhanaRegion } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category  = searchParams.get('category') as ProductCategory | null
    const search    = searchParams.get('search')
    const sort      = searchParams.get('sort') ?? 'newest'
    const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20))
    const offset    = Math.max(0, parseInt(searchParams.get('offset') ?? '0') || 0)
    const region    = searchParams.get('region') as GhanaRegion | null
    const valueTag  = searchParams.get('value_tag')
    const sdgTag    = searchParams.get('sdg_tag')
    const vendorId  = searchParams.get('vendor_id')
    // RLS still limits non-approved rows to their owner or an admin
    const showAll   = searchParams.get('show_all') === 'true'

    let query = supabase
      .from('products')
      .select('*, vendor:vendor_profiles(id, business_name, logo_url, location, region)', {
        count: 'exact',
      })

    if (!showAll) {
      query = query.eq('status', 'approved')
    }

    if (category)  query = query.eq('category', category)
    if (region)    query = query.eq('region', region)
    if (vendorId)  query = query.eq('vendor_id', vendorId)
    if (valueTag)  query = query.contains('value_tags', [valueTag])
    if (sdgTag)    query = query.contains('sdg_tags', [sdgTag])

    const searchFilter = productSearchFilter(search)
    if (searchFilter) query = query.or(searchFilter)

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: vendorProfile } = await supabase
      .from('vendor_profiles')
      .select('id, status, business_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!vendorProfile) {
      return NextResponse.json({ error: 'Only approved vendors can create listings' }, { status: 403 })
    }

    if (vendorProfile.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your vendor application must be approved before listing products' },
        { status: 403 },
      )
    }

    const parsed = listingSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    // The vendor's own session, so RLS and the database guard (migration 007)
    // apply as well: a new listing always starts in the review queue
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        ...input,
        vendor_id:     vendorProfile.id,
        slug:          generateSlug(input.title),
        unit:          input.unit || null,
        minimum_order: input.minimum_order ?? 1,
        status:        'pending_review',
      })
      .select()
      .single()

    if (insertError || !product) {
      console.error('[POST /api/products] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }

    await sendAdminAlert({
      subject: `New listing to review: ${product.title}`,
      heading: 'A new listing is waiting for review',
      intro: 'It stays hidden from buyers until it is approved.',
      rows: [
        ['Listing', product.title],
        ['Vendor', vendorProfile.business_name],
        ['Category', CATEGORY_META[product.category as ProductCategory]?.label ?? product.category],
        ['Price', formatCurrency(product.price_ghs)],
      ],
      cta: { path: '/admin/listings', label: 'Review listings' },
    }).catch(err => console.error('[Email] new listing alert:', err))

    return NextResponse.json(
      { data: product, message: 'Listing submitted for review' },
      { status: 201 },
    )
  } catch (err) {
    console.error('[POST /api/products]', err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
