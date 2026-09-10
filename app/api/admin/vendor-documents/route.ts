import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { signedDeliveryUrl } from '@/lib/cloudinary/signing'

// GET /api/admin/vendor-documents?vendor_id=...: an applicant's supporting
// photos for the review screen. The files are private ('authenticated') in
// Cloudinary; this signs a viewing URL per file, for admins only.
export async function GET(request: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  const vendorId = new URL(request.url).searchParams.get('vendor_id')
  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 })
  }

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

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden, admin access required' }, { status: 403 })
  }

  const admin = await createAdminClient()
  const { data: documents, error } = await admin
    .from('vendor_documents')
    .select('id, public_id, label, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true })

  if (error) {
    // Most likely migration 007 hasn't been run yet
    console.error('[GET /api/admin/vendor-documents]', error)
    return NextResponse.json({ data: [] })
  }

  if (!cloudName || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 })
  }

  return NextResponse.json({
    data: (documents ?? []).map(doc => ({
      id: doc.id,
      label: doc.label,
      created_at: doc.created_at,
      url: signedDeliveryUrl({ cloudName, publicId: doc.public_id, apiSecret }),
    })),
  })
}
