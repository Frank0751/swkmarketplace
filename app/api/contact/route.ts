import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendContactMessage } from '@/lib/email/brevo'

const schema = z.object({
  name:    z.string().trim().min(2).max(100),
  email:   z.string().trim().email().max(200),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(5000),
  // Honeypot: real users never see this field, bots fill everything in.
  // Accepted by the schema on purpose so a filled value reaches the check
  // below and can be discarded silently rather than rejected with a 400.
  company: z.string().max(200).optional(),
})

// Simple in-memory rate limit: 3 messages per IP per 10 minutes. Resets on
// deploy and isn't shared across serverless instances, but it's enough to stop
// a naive bot burning through the Brevo daily quota.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 3
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)
    return true
  }

  recent.push(now)
  hits.set(ip, recent)

  // Opportunistic cleanup so the map can't grow without bound
  if (hits.size > 5000) {
    hits.forEach((times: number[], key: string) => {
      if (times.every((t: number) => now - t >= WINDOW_MS)) hits.delete(key)
    })
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a few minutes.' },
        { status: 429 },
      )
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please check your details and try again.' }, { status: 400 })
    }

    const { company, ...message } = parsed.data

    // Honeypot tripped: accept silently so the bot doesn't learn it was caught
    if (company) {
      return NextResponse.json({ success: true })
    }

    const result = await sendContactMessage(message)

    if ((result as { skipped?: boolean }).skipped) {
      console.error('[Contact] BREVO_API_KEY not configured, message not delivered')
      return NextResponse.json(
        { error: 'Messaging is temporarily unavailable. Please email info@swkghana.org directly.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Contact] Send failed:', err)
    return NextResponse.json(
      { error: 'Could not send your message. Please try again or email info@swkghana.org.' },
      { status: 500 },
    )
  }
}
