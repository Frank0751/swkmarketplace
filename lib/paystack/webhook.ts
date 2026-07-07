import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaystackWebhookEvent {
  event: string
  data: {
    reference: string
    status: string
    amount: number          // in pesewas
    currency?: string
    paid_at?: string
    customer: {
      email: string
      first_name?: string
      last_name?: string
      phone?: string
    }
    metadata?: Record<string, unknown>
    gateway_response?: string
    channel?: string
    fees?: number
    authorization?: {
      authorization_code?: string
      card_type?: string
      last4?: string
      bank?: string
      brand?: string
      channel?: string
    }
  }
}

// ─── Signature verification ────────────────────────────────────────────────────

/**
 * Verifies that a Paystack webhook request is authentic.
 *
 * Paystack signs the raw request body with HMAC-SHA512 using the webhook secret.
 * The resulting hex digest is sent in the `x-paystack-signature` header.
 *
 * @param payload   - The raw request body string (NOT parsed JSON)
 * @param signature - The value of the `x-paystack-signature` header
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Fall back to PAYSTACK_SECRET_KEY if webhook secret not set separately
  const secret =
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY

  if (!secret) {
    console.error('[Paystack Webhook] Missing PAYSTACK_WEBHOOK_SECRET env var')
    return false
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  try {
    const hashBuffer = Buffer.from(hash, 'hex')
    const sigBuffer = Buffer.from(signature, 'hex')

    if (hashBuffer.length !== sigBuffer.length) return false

    return crypto.timingSafeEqual(hashBuffer, sigBuffer)
  } catch {
    return false
  }
}

// ─── Event type helpers ───────────────────────────────────────────────────────

export const PAYSTACK_EVENTS = {
  CHARGE_SUCCESS: 'charge.success',
  TRANSFER_SUCCESS: 'transfer.success',
  TRANSFER_FAILED: 'transfer.failed',
  TRANSFER_REVERSED: 'transfer.reversed',
} as const

export type PaystackEventType = typeof PAYSTACK_EVENTS[keyof typeof PAYSTACK_EVENTS]
