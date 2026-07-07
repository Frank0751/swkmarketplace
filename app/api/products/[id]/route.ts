import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import { sendListingApproved } from '@/lib/email/brevo'
import type { ProductStatus } from '@/types'

const CONTENT_FIELDS = ['title', 'description', 'short_description', 'price_ghs', 'images', 'category']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('products')
      .select('*, vendor:vendor_profiles(*, user:users(*))')
      .eq('id', params.id)

    const { data: product, error } = await query.single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Non-approved products are only visible to owner or admin
    if (product.status !== 'approved') {
      if (!user) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        const vendorUserId = (product.vendor as { user_id?: string } | null)?.user_id
        if (vendorUserId !== user.id) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
      }
    }

    // Increment view count (fire-and-forget)
    const adminSupabase = await createAdminClient()
    void adminSupabase
      .from('products')
      .update({ views: (product.views ?? 0) + 1 })
      .eq('id', params.id)
      .then(undefined, () => {})

    return NextResponse.json({ data: product })
  } catch (err) {
    console.error('[GET /api/products/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const role = profile?.role

    if (role !== 'vendor' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch current product
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*, vendor:vendor_profiles(id, user_id, user:users(email))')
      .eq('id', params.id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Vendors can only edit their own products
    if (role === 'vendor') {
      const vendorUserId = (product.vendor as { user_id?: string } | null)?.user_id
      if (vendorUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { status: newStatus, rejection_reason, ...rest } = body as {
      status?: ProductStatus
      rejection_reason?: string
      [key: string]: unknown
    }

    const updatePayload: Record<string, unknown> = { ...rest }

    // Admins can set status directly
    if (role === 'admin' && newStatus) {
      updatePayload.status = newStatus
      if (newStatus === 'rejected' && rejection_reason) {
        updatePayload.rejection_reason = rejection_reason
      }
    }

    // Vendors: if content fields changed, reset to pending_review
    if (role === 'vendor') {
      const contentChanged = CONTENT_FIELDS.some(field => field in rest)
      if (contentChanged) {
        updatePayload.status = 'pending_review'
        updatePayload.rejection_reason = null
      }
    }

    // Auto-regenerate slug if title changed
    if (rest.title && typeof rest.title === 'string') {
      updatePayload.slug = generateSlug(rest.title)
    }

    // If price_ghs changed, update price (pesewas) too
    if (rest.price_ghs && typeof rest.price_ghs === 'number') {
      updatePayload.price = Math.round(rest.price_ghs * 100)
    }

    const adminSupabase = await createAdminClient()
    const { data: updated, error: updateError } = await adminSupabase
      .from('products')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send listing approved email
    if (role === 'admin' && newStatus === 'approved') {
      const vendorEmail = (product.vendor as { user?: { email?: string } } | null)?.user?.email
      if (vendorEmail) {
        sendListingApproved(vendorEmail, { title: product.title })
          .catch(err => console.error('[Email] listing approved:', err))
      }
    }

    return NextResponse.json({ data: updated, message: 'Product updated' })
  } catch (err) {
    console.error('[PATCH /api/products/[id]]', err)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const role = profile?.role

    if (role !== 'vendor' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch product to check ownership
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, vendor:vendor_profiles(user_id), status')
      .eq('id', params.id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (role === 'vendor') {
      const vendorUserId = (product.vendor as { user_id?: string } | null)?.user_id
      if (vendorUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Prevent deletion of products with active orders
    if (product.status === 'approved') {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', params.id)
        .in('status', ['pending', 'paid', 'confirmed', 'dispatched'])

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete a product with active orders. Pause it instead.' },
          { status: 400 },
        )
      }
    }

    const adminSupabase = await createAdminClient()
    const { error: deleteError } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Product deleted' })
  } catch (err) {
    console.error('[DELETE /api/products/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
