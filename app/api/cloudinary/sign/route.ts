import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signUploadParams } from '@/lib/cloudinary/signing'

// Signed uploads: the browser never sees CLOUDINARY_API_SECRET. It asks this
// route for a short-lived signature, then posts the file straight to Cloudinary.
//
//   purpose 'listing' (default): product photos, public, approved vendors and
//     admins only, so the endpoint can't be used as free file hosting.
//   purpose 'vendor_document': an applicant's supporting photos. Any signed-in
//     user, uploaded as 'authenticated' assets into a folder named after them,
//     so they can only be viewed through signed URLs generated for admins.
export async function POST(request: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[Cloudinary] Credentials not configured')
    return NextResponse.json(
      { error: 'Image uploads are not configured yet.' },
      { status: 503 },
    )
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { purpose?: string }
  const timestamp = Math.round(Date.now() / 1000)

  if (body.purpose === 'vendor_document') {
    const folder = `swk-marketplace/vendor-docs/${user.id}`
    const type = 'authenticated'
    const signature = signUploadParams({ folder, timestamp, type }, apiSecret)
    return NextResponse.json({ cloudName, apiKey, timestamp, folder, type, signature })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'vendor' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Vendor access required' }, { status: 403 })
  }

  // Vendors must be approved before they can upload listing photos
  if (profile.role === 'vendor') {
    const { data: vendorProfile } = await supabase
      .from('vendor_profiles')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (vendorProfile?.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your vendor account must be approved before uploading images.' },
        { status: 403 },
      )
    }
  }

  const folder = 'swk-marketplace/products'
  const signature = signUploadParams({ folder, timestamp }, apiSecret)

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature })
}
