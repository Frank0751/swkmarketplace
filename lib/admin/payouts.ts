import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, Payout, User, VendorPayoutDetails, VendorProfile } from '@/types'
import { formatGhanaPhone } from '@/lib/marketplace/phone'

export type AdminPayout = Omit<Payout, 'vendor' | 'order'> & {
  order?: Pick<Order, 'id' | 'reference' | 'status'> | null
  vendor?: (Pick<VendorProfile, 'id' | 'business_name'> & {
    user?: Pick<User, 'email' | 'full_name'> | null
    payout_details?: VendorPayoutDetails | null
  }) | null
}

/**
 * Payouts with where to send each one. Used by the server page and the
 * client refresh. Payout details are fetched separately so the payouts still
 * load if that table isn't available.
 */
export async function loadAdminPayouts(supabase: SupabaseClient): Promise<AdminPayout[]> {
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      *,
      order:orders(id, reference, status),
      vendor:vendor_profiles(id, business_name, user:users(email, full_name))
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  const payouts = (data ?? []) as unknown as AdminPayout[]

  const vendorIds = Array.from(new Set(payouts.map(p => p.vendor_id)))
  if (vendorIds.length > 0) {
    const { data: details, error: detailsError } = await supabase
      .from('vendor_payout_details')
      .select('*')
      .in('vendor_id', vendorIds)

    if (!detailsError) {
      const byVendor = new Map((details ?? []).map(d => [d.vendor_id as string, d as VendorPayoutDetails]))
      for (const payout of payouts) {
        if (payout.vendor) payout.vendor.payout_details = byVendor.get(payout.vendor_id) ?? null
      }
    }
  }

  return payouts
}

/** "MTN MoMo · +233 24 123 4567 · Kofi Mensah" */
export function describePayoutDestination(details?: VendorPayoutDetails | null): string | null {
  if (!details) return null
  if (details.method === 'momo') {
    return `${details.momo_network} · ${formatGhanaPhone(details.account_number)} · ${details.account_name}`
  }
  return `${details.bank_name} · ${details.account_number} · ${details.account_name}`
}
