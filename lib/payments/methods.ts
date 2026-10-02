import type { MomoNetwork, PaymentMethod } from '@/types'
import { CARD_BRAND_LABEL, type CardBrand } from '@/lib/payments/test-cards'
import { normalizeGhanaPhone } from '@/lib/marketplace/phone'

// ─── Mobile money ─────────────────────────────────────────────────────────────

export interface MomoNetworkInfo {
  id: MomoNetwork
  short: string
  /** Leading digits of numbers issued by the network, local form */
  prefixes: string[]
}

export const MOMO_NETWORKS: MomoNetworkInfo[] = [
  { id: 'MTN MoMo',     short: 'MTN',     prefixes: ['024', '025', '053', '054', '055', '059'] },
  { id: 'Telecel Cash', short: 'Telecel', prefixes: ['020', '050'] },
  { id: 'AT Money',     short: 'AT',      prefixes: ['026', '027', '056', '057'] },
]

export const MOMO_NETWORK_IDS = MOMO_NETWORKS.map(n => n.id) as [MomoNetwork, ...MomoNetwork[]]

/**
 * A mobile money wallet is a mobile number: 02x or 05x. Landlines (03x) can't
 * hold one. Returns +233XXXXXXXXX or null.
 */
export function normalizeMomoNumber(input: string | null | undefined): string | null {
  const phone = normalizeGhanaPhone(input)
  return phone && /^\+233[25]/.test(phone) ? phone : null
}

/** Best guess at the network from the number, to preselect it */
export function guessMomoNetwork(input: string | null | undefined): MomoNetwork | null {
  const phone = normalizeMomoNumber(input)
  if (!phone) return null
  const local = '0' + phone.slice(4, 6)
  return MOMO_NETWORKS.find(n => n.prefixes.includes(local))?.id ?? null
}

/** "+233241234567" -> "024 ••• 4567" */
export function maskPhone(phone: string | null | undefined): string {
  const normalized = normalizeGhanaPhone(phone)
  if (!normalized) return phone ?? ''
  const local = '0' + normalized.slice(4)
  return `${local.slice(0, 3)} ••• ${local.slice(-4)}`
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export function cardLabel(brand: CardBrand | string | null | undefined, last4: string): string {
  const name = brand && brand in CARD_BRAND_LABEL ? CARD_BRAND_LABEL[brand as CardBrand] : 'Card'
  return `${name} •••• ${last4}`
}

export function momoLabel(network: string | null | undefined, phone: string | null | undefined): string {
  const last4 = (normalizeGhanaPhone(phone) ?? '').slice(-4)
  return `${network ?? 'Mobile money'} •••• ${last4}`
}

/** How a saved method reads in lists and receipts: "Visa •••• 4081", "MTN MoMo •••• 4567" */
export function paymentMethodLabel(
  method: Pick<PaymentMethod, 'kind' | 'brand' | 'last4' | 'momo_network' | 'momo_phone'>,
): string {
  return method.kind === 'card'
    ? cardLabel(method.brand, method.last4)
    : momoLabel(method.momo_network, method.momo_phone)
}

/** "08/29" */
export function formatExpiry(month: number | null | undefined, year: number | null | undefined): string {
  if (!month || !year) return ''
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
}
