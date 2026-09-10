/**
 * Ghana phone numbers, as buyers actually type them: "024 123 4567",
 * "0241234567", "+233 24 123 4567" or "233241234567". Mobile prefixes start
 * with 2 or 5 and landlines with 3, followed by eight more digits.
 *
 * Returns the number in international form (+233XXXXXXXXX), or null.
 */
export function normalizeGhanaPhone(input: string | null | undefined): string | null {
  const compact = (input ?? '').replace(/[\s\-().]/g, '')
  const match = compact.match(/^(?:\+?233|0)([235]\d{8})$/)
  return match ? `+233${match[1]}` : null
}

/**
 * Vendors may be based outside Ghana while serving Ghanaian communities, so
 * their contact number can also be any international number (+ and 8-15 digits).
 */
export function normalizeContactPhone(input: string | null | undefined): string | null {
  const ghana = normalizeGhanaPhone(input)
  if (ghana) return ghana
  const compact = (input ?? '').replace(/[\s\-().]/g, '')
  return /^\+\d{8,15}$/.test(compact) ? compact : null
}

/** "+233241234567" -> "+233 24 123 4567" for display. Other input is returned as-is. */
export function formatGhanaPhone(phone: string | null | undefined): string {
  const normalized = normalizeGhanaPhone(phone)
  if (!normalized) return phone ?? ''
  const local = normalized.slice(4)
  return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
}

/** Digits-only form for wa.me links: "233241234567". */
export function whatsappDigits(phone: string | null | undefined): string | null {
  const normalized = normalizeGhanaPhone(phone)
  return normalized ? normalized.slice(1) : null
}
