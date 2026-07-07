import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendVendorApproved } from '@/lib/email/brevo'

export async function POST(
  _request: NextRequest,
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

    if (vendor.status === 'approved') {
      return NextResponse.json({ error: 'Vendor is already approved' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update vendor_profiles: status = 'approved'
    const { data: updatedVendor, error: vendorUpdateError } = await adminSupabase
      .from('vendor_profiles')
      .update({
        status:           'approved',
        approved_at:      now,
        rejection_reason: null,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (vendorUpdateError) throw vendorUpdateError

    // Update users: role = 'vendor'
    const { error: userUpdateError } = await adminSupabase
      .from('users')
      .update({ role: 'vendor' })
      .eq('id', vendor.user_id)

    if (userUpdateError) {
      console.error('[Vendor approve] Failed to update user role:', userUpdateError)
      // Non-fatal — vendor profile is already approved
    }

    // Send approval email
    const vendorEmail = (vendor.user as { email?: string } | null)?.email
    if (vendorEmail) {
      sendVendorApproved(vendorEmail, { business_name: vendor.business_name })
        .catch(err => console.error('[Email] vendor approved:', err))
    }

    return NextResponse.json({
      data: updatedVendor,
      message: `${vendor.business_name} has been approved as a vendor`,
    })
  } catch (err) {
    console.error('[POST /api/vendors/[id]/approve]', err)
    return NextResponse.json({ error: 'Failed to approve vendor' }, { status: 500 })
  }
}
