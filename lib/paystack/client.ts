import axios from 'axios'

const PAYSTACK_BASE = 'https://api.paystack.co'

const paystackAxios = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitializePaymentParams {
  email: string
  amount: number // in GHS pesewas (GHS * 100)
  reference?: string
  metadata?: Record<string, unknown>
  callback_url?: string
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[]
}

export interface InitializePaymentResult {
  authorization_url: string
  access_code: string
  reference: string
}

export interface VerifyPaymentResult {
  status: string          // 'success' | 'failed' | 'abandoned' | 'pending'
  reference: string
  amount: number          // in pesewas
  currency: string
  paid_at: string
  customer: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
  }
  metadata: Record<string, unknown>
  gateway_response: string
  channel: string
}

// ─── Initialize payment ───────────────────────────────────────────────────────

export async function initializePayment(
  params: InitializePaymentParams,
): Promise<InitializePaymentResult> {
  const payload: Record<string, unknown> = {
    email: params.email,
    amount: Math.round(params.amount), // Paystack requires integer pesewas
    currency: 'GHS',
  }

  if (params.reference) payload.reference = params.reference
  if (params.metadata) payload.metadata = params.metadata
  if (params.callback_url) payload.callback_url = params.callback_url
  if (params.channels) payload.channels = params.channels

  const { data } = await paystackAxios.post<{
    status: boolean
    message: string
    data: {
      authorization_url: string
      access_code: string
      reference: string
    }
  }>('/transaction/initialize', payload)

  if (!data.status) {
    throw new Error(`Paystack initialization failed: ${data.message}`)
  }

  return {
    authorization_url: data.data.authorization_url,
    access_code: data.data.access_code,
    reference: data.data.reference,
  }
}

// ─── Verify payment ───────────────────────────────────────────────────────────

export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  const { data } = await paystackAxios.get<{
    status: boolean
    message: string
    data: {
      status: string
      reference: string
      amount: number
      currency: string
      paid_at: string
      customer: {
        email: string
        first_name?: string
        last_name?: string
        phone?: string
      }
      metadata: Record<string, unknown>
      gateway_response: string
      channel: string
    }
  }>(`/transaction/verify/${encodeURIComponent(reference)}`)

  if (!data.status) {
    throw new Error(`Paystack verification failed: ${data.message}`)
  }

  return {
    status: data.data.status,
    reference: data.data.reference,
    amount: data.data.amount,
    currency: data.data.currency,
    paid_at: data.data.paid_at,
    customer: data.data.customer,
    metadata: data.data.metadata || {},
    gateway_response: data.data.gateway_response,
    channel: data.data.channel,
  }
}

// ─── List banks (for transfer payouts) ────────────────────────────────────────

export async function listBanks(country = 'ghana') {
  const { data } = await paystackAxios.get<{
    status: boolean
    data: Array<{ id: number; name: string; code: string; longcode: string }>
  }>(`/bank?country=${country}&use_cursor=false&perPage=100`)

  if (!data.status) {
    throw new Error('Failed to fetch bank list from Paystack')
  }

  return data.data
}
