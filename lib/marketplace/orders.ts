import type { Order, OrderStatus } from '@/types'

// ─── Delivery fee ─────────────────────────────────────────────────────────────

/**
 * Flat delivery fee added to every order, in GHS. The product page displays it
 * and the orders API charges it; both read it from here so the price a buyer
 * sees is the price they pay (they used to disagree: 15 shown, 20 charged).
 */
export const DELIVERY_FEE_GHS = 20

// ─── Buyer confirmation window ────────────────────────────────────────────────

/**
 * Days after dispatch a buyer has to confirm delivery or report a problem.
 * After that the Terms allow SWK Ghana to confirm on the buyer's behalf once
 * it has checked with the vendor, so a silent buyer can't hold a vendor's
 * money forever. Nothing happens automatically: the admin orders page flags
 * these orders and a person decides.
 */
export const CONFIRMATION_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function isConfirmationOverdue(
  order: Pick<Order, 'status' | 'dispatched_at'>,
  now: Date = new Date(),
): boolean {
  if (order.status !== 'dispatched' || !order.dispatched_at) return false
  return now.getTime() - new Date(order.dispatched_at).getTime() > CONFIRMATION_WINDOW_DAYS * DAY_MS
}

// ─── Status transitions ───────────────────────────────────────────────────────

export type OrderActor = 'buyer' | 'vendor' | 'admin'

/**
 * Who may move an order from one status to another. The orders API enforces
 * this and the admin UI reads it, so the two can't drift apart.
 */
export const ORDER_TRANSITIONS: Record<OrderActor, Record<OrderStatus, OrderStatus[]>> = {
  // Vendors act only on paid orders. Confirming an unpaid order used to be
  // allowed, and a payment arriving afterwards then skipped payout creation.
  vendor: {
    pending:    [],
    paid:       ['confirmed'],
    confirmed:  ['dispatched'],
    dispatched: [],
    delivered:  [],
    released:   [],
    disputed:   [],
    refunded:   [],
    cancelled:  [],
  },
  buyer: {
    pending:    ['cancelled'],
    paid:       ['disputed'],
    confirmed:  ['disputed'],
    dispatched: ['delivered', 'disputed'],
    delivered:  [],
    released:   [],
    disputed:   [],
    refunded:   [],
    cancelled:  [],
  },
  // 'released' is reached only from the payouts page, which releases the
  // payout and the order together. Resolving a dispute in the vendor's favour
  // means marking it delivered, which queues the payout for release.
  admin: {
    pending:    ['paid', 'cancelled'],
    paid:       ['confirmed', 'disputed', 'refunded'],
    confirmed:  ['dispatched', 'disputed', 'refunded'],
    dispatched: ['delivered', 'disputed', 'refunded'],
    delivered:  [],
    released:   [],
    disputed:   ['delivered', 'refunded'],
    refunded:   [],
    cancelled:  [],
  },
}

export function canTransition(actor: OrderActor, from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[actor]?.[from]?.includes(to) ?? false
}

/** Statuses in which a buyer's money is held and a problem can still be reported. */
export const DISPUTABLE_STATUSES: OrderStatus[] = ['paid', 'confirmed', 'dispatched']
