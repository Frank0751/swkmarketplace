import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { initializePayment, paymentsMode } from '@/lib/paystack/client'
import { expectedPesewas } from '@/lib/paystack/confirm'
import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'
import { normalizeGhanaPhone } from '@/lib/marketplace/phone'
import { firstIssue } from '@/lib/marketplace/listing'
import { isDemoId } from '@/lib/demo/data'
import { GHANA_REGIONS, type GhanaRegion } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

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

const orderSchema = z.object({
  product_id:       z.string().min(1, 'Choose a product'),
  quantity:         z.coerce.number().int().min(1, 'Quantity must be at least 1').max(1000),
  delivery_address: z.string().trim().min(5, 'Please enter a fuller delivery address').max(300),
  delivery_region:  z.enum(GHANA_REGIONS as [GhanaRegion, ...GhanaRegion[]], {
    errorMap: () => ({ message: 'Please select a delivery region' }),
  }),
  delivery_phone:   z.string().trim().refine(
    value => normalizeGhanaPhone(value) !== null,
    'Enter a Ghana phone number the vendor can call, e.g. 024 123 4567',
  ),
  buyer_notes:      z.string().trim().max(500).optional(),
})

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to place an order', code: 'auth_required' },
        { status: 401 },
      )
    }

    const parsed = orderSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    if (isDemoId(input.product_id)) {
      return NextResponse.json(
        { error: 'Sample products show how the marketplace works and can’t be ordered.' },
        { status: 400 },
      )
    }

    // Checked before anything is written, so no order is left behind unpaid
    if (paymentsMode() === 'off') {
      return NextResponse.json(
        { error: 'Online payment isn’t switched on yet. Please check back soon.', code: 'payments_unavailable' },
        { status: 503 },
      )
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, title, status, price_ghs, stock_quantity, minimum_order, vendor:vendor_profiles(id, user_id, status)')
      .eq('id', input.product_id)
      .maybeSingle()

    const vendor = product?.vendor as unknown as { id: string; user_id: string; status: string } | null

    if (!product || product.status !== 'approved' || !vendor || vendor.status !== 'approved') {
      return NextResponse.json({ error: 'This product is no longer available' }, { status: 404 })
    }

    if (vendor.user_id === user.id) {
      return NextResponse.json({ error: 'You can’t order your own product' }, { status: 400 })
    }

    if (product.stock_quantity < input.quantity) {
      return NextResponse.json(
        { error: product.stock_quantity > 0 ? `Only ${product.stock_quantity} left in stock` : 'This product is out of stock' },
        { status: 400 },
      )
    }

    if (product.minimum_order && input.quantity < product.minimum_order) {
      return NextResponse.json(
        { error: `Minimum order quantity is ${product.minimum_order}` },
        { status: 400 },
      )
    }

    const { data: buyer } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!buyer?.email) {
      return NextResponse.json({ error: 'Your account has no email address for the receipt' }, { status: 400 })
    }

    // Prices come from the database, never from the request
    const unit_price   = Number(product.price_ghs)
    const subtotal     = round2(unit_price * input.quantity)
    const delivery_fee = DELIVERY_FEE_GHS
    const total_amount = round2(subtotal + delivery_fee)

    // Reference auto-generated by Postgres trigger
    const admin = await createAdminClient()
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        buyer_id:         user.id,
        vendor_id:        vendor.id,
        product_id:       product.id,
        quantity:         input.quantity,
        unit_price,
        subtotal,
        delivery_fee,
        total_amount,
        status:           'pending',
        delivery_address: input.delivery_address,
        delivery_region:  input.delivery_region,
        delivery_phone:   normalizeGhanaPhone(input.delivery_phone),
        buyer_notes:      input.buyer_notes || null,
      })
      .select('id, reference, total_amount')
      .single()

    if (orderError || !order) {
      console.error('[POST /api/orders] Order insert error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    let payment: { authorization_url: string; reference: string }
    try {
      payment = await initializePayment({
        email:  buyer.email,
        amount: expectedPesewas(total_amount),
        metadata: {
          order_id:  order.id,
          reference: order.reference,
          buyer_id:  user.id,
          vendor_id: vendor.id,
        },
        callback_url: `${APP_URL}/buyer/orders/${order.id}?payment=success`,
      })
    } catch (err) {
      console.error('[POST /api/orders] Payment initialisation failed:', err)
      await admin
        .from('orders')
        .update({ status: 'cancelled', admin_notes: 'Cancelled automatically: the payment page could not be opened.' })
        .eq('id', order.id)
      return NextResponse.json(
        { error: 'We couldn’t open the payment page. Please try again in a moment.' },
        { status: 502 },
      )
    }

    await admin
      .from('orders')
      .update({ paystack_reference: payment.reference })
      .eq('id', order.id)

    return NextResponse.json(
      {
        order_id:    order.id,
        reference:   order.reference,
        payment_url: payment.authorization_url,
        message:     'Order created',
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('[POST /api/orders]', err)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    )
  }
}
