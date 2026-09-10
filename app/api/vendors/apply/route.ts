import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendAdminAlert } from '@/lib/email/brevo'
import { normalizeContactPhone } from '@/lib/marketplace/phone'
import { PRODUCT_CATEGORIES, firstIssue } from '@/lib/marketplace/listing'
import { CATEGORY_META, GHANA_REGIONS, type GhanaRegion, type ProductCategory } from '@/types'

const optionalText = z.string().trim().max(200).optional().or(z.literal(''))

const applySchema = z.object({
  business_name:            z.string().trim().min(2, 'Business name must be at least 2 characters').max(120),
  business_description:     z.string().trim().min(100, 'Description must be at least 100 characters').max(3000),
  category:                 z.enum(PRODUCT_CATEGORIES as [ProductCategory, ...ProductCategory[]], {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  location:                 z.string().trim().min(2, 'Please enter your city or town').max(120),
  region:                   z.enum(GHANA_REGIONS as [GhanaRegion, ...GhanaRegion[]], {
    errorMap: () => ({ message: 'Please select a region' }),
  }),
  phone:                    z.string().trim().refine(
    value => normalizeContactPhone(value) !== null,
    'Enter a phone number, e.g. 024 123 4567 or +233 24 123 4567',
  ),
  sustainability_statement: z.string().trim().min(50, 'Please describe how your business supports SDG 12 (min 50 characters)').max(3000),
  instagram:                optionalText,
  facebook:                 optionalText,
  website:                  z.string().trim().url('Please enter a valid URL').optional().or(z.literal('')),
  documents:                z.array(z.object({
    public_id: z.string().min(1).max(300),
    label:     z.string().trim().max(80).optional(),
  })).max(3, 'Up to 3 supporting photos').optional(),
})

// POST /api/vendors/apply: submit or resubmit a vendor application.
// Runs under the applicant's own session, so RLS and the database guard
// (migration 007) apply: an application always starts as 'pending', whatever
// the request says. Doing it here rather than in the browser also lets SWK
// Ghana be told the moment someone applies.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to apply', code: 'auth_required' }, { status: 401 })
    }

    const parsed = applySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    const { data: existing } = await supabase
      .from('vendor_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'Your application is already under review.' }, { status: 409 })
    }
    if (existing?.status === 'approved') {
      return NextResponse.json({ error: 'You are already an approved vendor.', code: 'already_approved' }, { status: 409 })
    }
    if (existing?.status === 'suspended') {
      return NextResponse.json(
        { error: 'Your vendor account is suspended. Please contact info@swkghana.org.' },
        { status: 403 },
      )
    }

    const profilePayload = {
      business_name:            input.business_name,
      business_description:     input.business_description,
      category:                 input.category,
      location:                 input.location,
      region:                   input.region,
      phone:                    normalizeContactPhone(input.phone),
      sustainability_statement: input.sustainability_statement,
      social_links: {
        instagram: input.instagram || undefined,
        facebook:  input.facebook  || undefined,
        website:   input.website   || undefined,
      },
      status: 'pending',
    }

    const write = existing
      ? supabase.from('vendor_profiles').update(profilePayload).eq('id', existing.id).select('id').single()
      : supabase.from('vendor_profiles').insert({ ...profilePayload, user_id: user.id }).select('id').single()

    const { data: profile, error: writeError } = await write
    if (writeError || !profile) {
      console.error('[POST /api/vendors/apply] write failed:', writeError)
      return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
    }

    // Applicants see the vendor dashboard (with their application status).
    // The only role change a user may make themselves; selling still needs
    // vendor_profiles.status = 'approved', which only an admin can set.
    const { data: account } = await supabase
      .from('users')
      .select('role, email, full_name')
      .eq('id', user.id)
      .single()

    if (account?.role === 'buyer') {
      const { error: roleError } = await supabase.from('users').update({ role: 'vendor' }).eq('id', user.id)
      if (roleError) console.error('[POST /api/vendors/apply] role update failed:', roleError)
    }

    // Supporting photos were uploaded straight to a private Cloudinary folder
    // named after this user; accept only files from that folder
    const ownFolder = `swk-marketplace/vendor-docs/${user.id}/`
    const documents = (input.documents ?? []).filter(d => d.public_id.startsWith(ownFolder))
    if (documents.length > 0) {
      const { error: docsError } = await supabase.from('vendor_documents').insert(
        documents.map(d => ({ vendor_id: profile.id, public_id: d.public_id, label: d.label || null })),
      )
      if (docsError) console.error('[POST /api/vendors/apply] documents insert failed:', docsError)
    }

    await sendAdminAlert({
      subject: `${existing ? 'Application resubmitted' : 'New vendor application'}: ${input.business_name}`,
      heading: existing ? 'A vendor application was resubmitted' : 'A new vendor application',
      intro: 'Review it within 2–3 business days, as promised on the application page.',
      rows: [
        ['Business', input.business_name],
        ['Category', CATEGORY_META[input.category]?.label ?? input.category],
        ['Location', `${input.location}, ${input.region}`],
        ['Applicant', account?.full_name],
        ['Email', account?.email ?? user.email],
        ['Supporting photos', documents.length || 'None'],
      ],
      cta: { path: '/admin/vendors', label: 'Review applications' },
    }).catch(err => console.error('[Email] application alert:', err))

    return NextResponse.json({ message: 'Application submitted' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/vendors/apply]', err)
    return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
  }
}
