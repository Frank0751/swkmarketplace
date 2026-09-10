import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/paystack/webhook'
import { createAdminClient } from '@/lib/supabase/server'
import { settleOrderPayment } from '@/lib/paystack/confirm'

export const runtime = 'nodejs'

/** Paystack sends metadata as an object, or as a JSON string when a payment was started from Paystack Inline */
function readMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

export async function POST(request: NextRequest) {
  let body: string

  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  const signature = request.headers.get('x-paystack-signature') || ''

  if (!verifyWebhookSignature(body, signature)) {
    console.warn('[Paystack Webhook] Invalid signature, rejecting request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; data?: { reference?: string; metadata?: unknown } }

  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const reference = event.data?.reference

  try {
    const supabase = await createAdminClient()

    if (event.event === 'charge.success' && reference) {
      // A valid signature only proves Paystack sent this, not that the payment
      // covers the order: anyone can start a payment with the public key and
      // attach any order id. settleOrderPayment re-verifies amount and currency.
      const metadata = readMetadata(event.data?.metadata)
      const result = await settleOrderPayment(supabase, {
        reference,
        orderId: typeof metadata.order_id === 'string' ? metadata.order_id : null,
      })
      console.log(`[Paystack Webhook] charge.success ${reference}: ${result.outcome}`)
    }

    if (event.event === 'transfer.success' && reference) {
      await supabase
        .from('payouts')
        .update({ status: 'released' })
        .eq('paystack_transfer_id', reference)
    }

    if ((event.event === 'transfer.failed' || event.event === 'transfer.reversed') && reference) {
      await supabase
        .from('payouts')
        .update({ status: 'failed' })
        .eq('paystack_transfer_id', reference)
    }
  } catch (err) {
    console.error('[Paystack Webhook] Processing error:', err)
    // A 500 makes Paystack retry later. Settling is idempotent, so a retry can
    // never mark an order paid twice or send its emails twice.
    return NextResponse.json({ error: 'Processing failed, will be retried' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
