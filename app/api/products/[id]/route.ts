import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import {
  listingSchema,
  reviewedContentChanged,
  changedFields,
  firstIssue,
} from '@/lib/marketplace/listing'
import { sendListingApproved, sendListingRejected, sendAdminAlert } from '@/lib/email/brevo'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: product, error } = await supabase
      .from('products')
      .select('*, vendor:vendor_profiles(*, user:users(*))')
      .eq('id', params.id)
      .single()

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

    return NextResponse.json({ data: product })
  } catch (err) {
    console.error('[GET /api/products/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

const adminSchema = z.object({
  status:           z.enum(['approved', 'rejected', 'paused', 'pending_review']),
  rejection_reason: z.string().trim().max(1000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
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

    const { data: product } = await supabase
      .from('products')
      .select('*, vendor:vendor_profiles(id, user_id, business_name, user:users(email))')
      .eq('id', params.id)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const vendor = product.vendor as unknown as {
      id: string
      user_id: string
      business_name: string
      user?: { email?: string }
    } | null

    const body = await request.json().catch(() => ({}))

    // ── Admin: review decisions ────────────────────────────────────────────
    if (role === 'admin') {
      const parsed = adminSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
      }
      const { status, rejection_reason } = parsed.data

      if (status === 'rejected' && !rejection_reason) {
        return NextResponse.json({ error: 'Tell the vendor what to change' }, { status: 400 })
      }

      const admin = await createAdminClient()
      const { data: updated, error } = await admin
        .from('products')
        .update({ status, rejection_reason: status === 'rejected' ? rejection_reason : null })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error

      const vendorEmail = vendor?.user?.email
      if (vendorEmail && status !== product.status) {
        if (status === 'approved') {
          await sendListingApproved(vendorEmail, { title: product.title })
            .catch(err => console.error('[Email] listing approved:', err))
        }
        if (status === 'rejected' && rejection_reason) {
          await sendListingRejected(vendorEmail, { title: product.title, reason: rejection_reason })
            .catch(err => console.error('[Email] listing rejected:', err))
        }
      }

      return NextResponse.json({ data: updated, message: 'Listing updated' })
    }

    // ── Vendor: editing their own listing ──────────────────────────────────
    if (vendor?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only listing fields are accepted; anything else in the body (status,
    // views, vendor_id...) is dropped rather than written
    const parsed = listingSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }

    const changes = changedFields(product, parsed.data)

    let nextStatus = product.status as string
    if (product.status === 'rejected') {
      // Saving a rejected listing resubmits it
      nextStatus = 'pending_review'
    } else if (product.status === 'approved' && reviewedContentChanged(product, changes)) {
      nextStatus = 'pending_review'
    }

    const payload: Record<string, unknown> = { ...changes }
    if (nextStatus !== product.status) {
      payload.status = nextStatus
      payload.rejection_reason = null
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ data: product, review: false, message: 'No changes to save' })
    }

    // The vendor's own session, so the database guard checks this write too.
    // The slug never changes: links already shared on WhatsApp keep working.
    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '42501') {
        return NextResponse.json({ error: updateError.message }, { status: 403 })
      }
      throw updateError
    }

    const sentForReview = updated.status === 'pending_review' && product.status !== 'pending_review'

    if (sentForReview) {
      await sendAdminAlert({
        subject: `Listing to review: ${updated.title}`,
        heading: product.status === 'rejected'
          ? 'A rejected listing was resubmitted'
          : 'A live listing was edited',
        intro: 'It is hidden from buyers until it is approved again.',
        rows: [
          ['Listing', updated.title],
          ['Vendor', vendor?.business_name],
          ['Price', formatCurrency(updated.price_ghs)],
        ],
        cta: { path: '/admin/listings', label: 'Review listings' },
      }).catch(err => console.error('[Email] listing review alert:', err))
    }

    return NextResponse.json({
      data: updated,
      review: sentForReview,
      message: sentForReview ? 'Saved and sent for review' : 'Listing updated',
    })
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
