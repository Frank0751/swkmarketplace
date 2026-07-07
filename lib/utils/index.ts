import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Tailwind class merge ─────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency ─────────────────────────────────────────────────────
export function formatCurrency(amount: number, currency = 'GHS'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) return `GHS ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `GHS ${(amount / 1_000).toFixed(1)}K`
  return formatCurrency(amount)
}

// ─── Dates ────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// ─── Slugs ────────────────────────────────────────────────────────
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Math.random().toString(36).substring(2, 7)
}

// ─── Order status helpers ─────────────────────────────────────────
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:    'Pending payment',
  paid:       'Payment received',
  confirmed:  'Confirmed by vendor',
  dispatched: 'Out for delivery',
  delivered:  'Delivered',
  released:   'Completed',
  disputed:   'Under dispute',
  refunded:   'Refunded',
  cancelled:  'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-sand-100 text-sand-600',
  paid:       'bg-teal-50 text-teal-700',
  confirmed:  'bg-blue-50 text-blue-700',
  dispatched: 'bg-gold-50 text-gold-700',
  delivered:  'bg-green-50 text-green-700',
  released:   'bg-green-50 text-green-700',
  disputed:   'bg-red-50 text-red-700',
  refunded:   'bg-sand-100 text-sand-600',
  cancelled:  'bg-red-50 text-red-700',
}

// ─── Vendor status ────────────────────────────────────────────────
export const VENDOR_STATUS_LABELS: Record<string, string> = {
  pending:   'Under review',
  approved:  'Approved',
  rejected:  'Rejected',
  suspended: 'Suspended',
}

// ─── Commission calc ──────────────────────────────────────────────
export function calculateCommission(amount: number, rate = 15): {
  gross: number
  commission: number
  net: number
} {
  const commission = Math.round((amount * rate / 100) * 100) / 100
  return {
    gross: amount,
    commission,
    net: Math.round((amount - commission) * 100) / 100,
  }
}

// ─── Truncate ─────────────────────────────────────────────────────
export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '…' : str
}

// ─── Image helpers ────────────────────────────────────────────────
export function getProductImageUrl(images: string[], index = 0): string {
  return images[index] || '/images/product-placeholder.svg'
}

// ─── Number formatting ────────────────────────────────────────────
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GH').format(n)
}
