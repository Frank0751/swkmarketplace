import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const REVIEWABLE_STATUSES = ['delivered', 'released']

// GET /api/reviews?product_id=xxx, public review list + reviewer names,
// plus eligibility info for the signed-in user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    // Admin client: users RLS hides other buyers' rows, but reviews should
    // display reviewer names, expose only full_name + avatar_url
    const adminSupabase = await createAdminClient()
    const { data: reviews, error } = await adminSupabase
      .from('product_reviews')
      .select('id, product_id, order_id, buyer_id, rating, comment, created_at, buyer:users(full_name, avatar_url)')
      .eq('product_id', product_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Eligibility for the signed-in user: a delivered/released order for this
    // product that has not been reviewed yet
    let can_review = false
    let reviewable_order_id: string | null = null

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('buyer_id', user.id)
        .eq('product_id', product_id)
        .in('status', REVIEWABLE_STATUSES)

      const reviewedOrderIds = new Set((reviews ?? []).filter(r => r.buyer_id === user.id).map(r => r.order_id))
      const eligible = (orders ?? []).find(o => !reviewedOrderIds.has(o.id))
      if (eligible) {
        can_review = true
        reviewable_order_id = eligible.id
      }
    }

    return NextResponse.json({ data: reviews ?? [], can_review, reviewable_order_id })
  } catch (err) {
    console.error('[GET /api/reviews]', err)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST /api/reviews, buyer reviews a product from a delivered order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, order_id, rating, comment } = body as {
      product_id?: string
      order_id?: string
      rating?: number
      comment?: string
    }

    if (!product_id || !order_id || !rating) {
      return NextResponse.json(
        { error: 'product_id, order_id, and rating are required' },
        { status: 400 },
      )
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be a whole number from 1 to 5' }, { status: 400 })
    }

    // Verify the order: belongs to this buyer, for this product, delivered
    const { data: order } = await supabase
      .from('orders')
      .select('id, buyer_id, product_id, status')
      .eq('id', order_id)
      .single()

    if (!order || order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.product_id !== product_id) {
      return NextResponse.json({ error: 'Order does not match this product' }, { status: 400 })
    }
    if (!REVIEWABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: 'You can review a product only after confirming delivery' },
        { status: 400 },
      )
    }

    const { data: review, error: insertError } = await supabase
      .from('product_reviews')
      .insert({
        product_id,
        order_id,
        buyer_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 409 })
      }
      throw insertError
    }

    return NextResponse.json({ data: review, message: 'Review submitted, thank you!' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reviews]', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
