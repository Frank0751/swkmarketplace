import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendVendorRejected } from '@/lib/email/brevo'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body as { reason?: string }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A rejection reason is required' },
        { status: 400 },
      )
    }

    const adminSupabase = await createAdminClient()

    // Fetch vendor profile with user data
    const { data: vendor, error: fetchError } = await adminSupabase
      .from('vendor_profiles')
      .select('*, user:users(*)')
      .eq('id', params.id)
      .single()

    if (fetchError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.status === 'rejected') {
      return NextResponse.json({ error: 'Vendor is already rejected' }, { status: 400 })
    }

    // Update vendor_profiles: status = 'rejected'
    const { data: updatedVendor, error: updateError } = await adminSupabase
      .from('vendor_profiles')
      .update({
        status:           'rejected',
        rejection_reason: reason.trim(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send rejection email
    const vendorEmail = (vendor.user as { email?: string } | null)?.email
    if (vendorEmail) {
      sendVendorRejected(vendorEmail, {
        business_name: vendor.business_name,
        reason:        reason.trim(),
      }).catch(err => console.error('[Email] vendor rejected:', err))
    }

    return NextResponse.json({
      data: updatedVendor,
      message: `${vendor.business_name}'s application has been rejected`,
    })
  } catch (err) {
    console.error('[POST /api/vendors/[id]/reject]', err)
    return NextResponse.json({ error: 'Failed to reject vendor' }, { status: 500 })
  }
}
