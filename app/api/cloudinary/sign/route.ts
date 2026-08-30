import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

// Signed uploads: the browser never sees CLOUDINARY_API_SECRET. It asks this
// route for a short-lived signature, then posts the file straight to Cloudinary.
// Only approved vendors (and admins) can get a signature, so the upload endpoint
// can't be used as free file hosting by anyone with the cloud name.
export async function POST() {
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

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'swk-marketplace/products'

  // Cloudinary signs the alphabetically sorted params, then the API secret
  const toSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex')

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature })
}
