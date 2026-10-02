import type { SupabaseClient } from '@supabase/supabase-js'
import type { BuyerAddress, GhanaRegion, MomoNetwork, PaymentMethod } from '@/types'
import type { CardBrand } from '@/lib/payments/test-cards'

// Saved addresses and payment methods are written only by the API (service
// role), so these helpers own the rules: no duplicates, at most a handful per
// person, and exactly one default.

export const MAX_SAVED = 10

export class SavedLimitError extends Error {}

/** Make one row the default. The unique index allows only one, so clear first. */
async function makeDefault(admin: SupabaseClient, table: 'buyer_addresses' | 'payment_methods', userId: string, id: string) {
  const { error: clearError } = await admin
    .from(table)
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true)
    .neq('id', id)
  if (clearError) throw clearError
  const { error } = await admin.from(table).update({ is_default: true }).eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function setDefault(
  admin: SupabaseClient,
  table: 'buyer_addresses' | 'payment_methods',
  userId: string,
  id: string,
) {
  return makeDefault(admin, table, userId, id)
}

/** After a default is deleted, the newest remaining one takes over */
export async function promoteNewestDefault(
  admin: SupabaseClient,
  table: 'buyer_addresses' | 'payment_methods',
  userId: string,
) {
  const { data: rows } = await admin
    .from(table)
    .select('id, is_default')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!rows || rows.length === 0 || rows.some(r => r.is_default)) return
  await makeDefault(admin, table, userId, rows[0].id as string)
}

export async function saveBuyerAddress(
  admin: SupabaseClient,
  userId: string,
  input: { label?: string | null; phone: string; region: GhanaRegion; address: string; makeDefault?: boolean },
): Promise<BuyerAddress> {
  const { data: existing, error: listError } = await admin
    .from('buyer_addresses')
    .select('*')
    .eq('user_id', userId)
  if (listError) throw listError
  const rows = (existing ?? []) as BuyerAddress[]

  const same = rows.find(a =>
    a.phone === input.phone &&
    a.region === input.region &&
    a.address.trim().toLowerCase() === input.address.trim().toLowerCase(),
  )

  let saved: BuyerAddress
  if (same) {
    saved = same
    if (input.label && input.label !== same.label) {
      await admin.from('buyer_addresses').update({ label: input.label }).eq('id', same.id)
      saved = { ...same, label: input.label }
    }
  } else {
    if (rows.length >= MAX_SAVED) {
      throw new SavedLimitError(`You can save up to ${MAX_SAVED} addresses. Remove one in your account settings first.`)
    }
    const { data, error } = await admin
      .from('buyer_addresses')
      .insert({
        user_id: userId,
        label:   input.label?.trim() || null,
        phone:   input.phone,
        region:  input.region,
        address: input.address.trim(),
      })
      .select('*')
      .single()
    if (error) throw error
    saved = data as BuyerAddress
  }

  const hasDefault = rows.some(a => a.is_default)
  if (input.makeDefault || !hasDefault) {
    await makeDefault(admin, 'buyer_addresses', userId, saved.id)
    saved = { ...saved, is_default: true }
  }
  return saved
}

export type NewPaymentMethod =
  | { kind: 'card'; brand: CardBrand; last4: string; exp_month: number; exp_year: number; holder_name: string }
  | { kind: 'momo'; momo_network: MomoNetwork; momo_phone: string }

export async function savePaymentMethod(
  admin: SupabaseClient,
  userId: string,
  method: NewPaymentMethod,
  options: { makeDefault?: boolean; provider?: 'demo' | 'paystack' } = {},
): Promise<PaymentMethod> {
  const provider = options.provider ?? 'demo'
  const { data: existing, error: listError } = await admin
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
  if (listError) throw listError
  const rows = (existing ?? []) as PaymentMethod[]

  const same = rows.find(m =>
    m.provider === provider && (
      method.kind === 'card'
        ? m.kind === 'card' && m.brand === method.brand && m.last4 === method.last4 &&
          m.exp_month === method.exp_month && m.exp_year === method.exp_year
        : m.kind === 'momo' && m.momo_phone === method.momo_phone
    ),
  )

  let saved: PaymentMethod
  if (same) {
    saved = same
    if (method.kind === 'momo' && same.momo_network !== method.momo_network) {
      await admin.from('payment_methods').update({ momo_network: method.momo_network }).eq('id', same.id)
      saved = { ...same, momo_network: method.momo_network }
    }
  } else {
    if (rows.length >= MAX_SAVED) {
      throw new SavedLimitError(`You can save up to ${MAX_SAVED} payment methods. Remove one first.`)
    }
    const row: Record<string, unknown> = method.kind === 'card'
      ? {
          user_id: userId, kind: 'card', provider,
          brand: method.brand, last4: method.last4,
          exp_month: method.exp_month, exp_year: method.exp_year,
          holder_name: method.holder_name.trim(),
        }
      : {
          user_id: userId, kind: 'momo', provider,
          momo_network: method.momo_network, momo_phone: method.momo_phone,
          last4: method.momo_phone.slice(-4),
        }
    const { data, error } = await admin.from('payment_methods').insert(row).select('*').single()
    if (error) throw error
    saved = data as PaymentMethod
  }

  const hasDefault = rows.some(m => m.is_default)
  if (options.makeDefault || !hasDefault) {
    await makeDefault(admin, 'payment_methods', userId, saved.id)
    saved = { ...saved, is_default: true }
  }
  return saved
}
