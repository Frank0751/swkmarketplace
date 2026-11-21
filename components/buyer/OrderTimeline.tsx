'use client'

import { Check } from 'lucide-react'
import { calculateCommission, cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const COMMISSION_RATE = Number(process.env.NEXT_PUBLIC_COMMISSION_RATE ?? 15)

interface Step {
  status: OrderStatus
  label: string
  /** What happened, and where the buyer's money is at this point */
  detail: (order: Order) => string
}

const STEPS: Step[] = [
  {
    status: 'pending',
    label: 'Order placed',
    detail: () => 'Waiting for payment.',
  },
  {
    status: 'paid',
    label: 'Paid, and held by SWK Ghana',
    detail: order => `SWK Ghana is holding ${formatCurrency(order.total_amount)}. The shop has not been paid.`,
  },
  {
    status: 'confirmed',
    label: 'Confirmed by the shop',
    detail: () => 'The shop has the product and is getting your order ready.',
  },
  {
    status: 'dispatched',
    label: 'On its way',
    detail: () => 'The shop has sent your order. SWK Ghana is still holding your money.',
  },
  {
    status: 'delivered',
    label: 'Delivery confirmed',
    detail: () => 'You said it arrived as described. SWK Ghana can now pay the shop.',
  },
  {
    status: 'released',
    label: 'Shop paid',
    detail: order => {
      const { commission, net } = calculateCommission(order.total_amount, COMMISSION_RATE)
      return `${formatCurrency(net)} went to the shop and ${formatCurrency(commission)} to SWK Ghana, which runs the marketplace and its youth programmes.`
    },
  },
]

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  pending: 0, paid: 1, confirmed: 2, dispatched: 3, delivered: 4, released: 5,
}

const EXCEPTIONS: Partial<Record<OrderStatus, { title: string; body: string; tone: string }>> = {
  disputed: {
    title: 'Problem reported',
    body: 'SWK Ghana is looking into it. Your money stays on hold until it is settled.',
    tone: 'bg-gold-50 text-gold-800',
  },
  refunded: {
    title: 'Refunded',
    body: 'This order was refunded to the account you paid with.',
    tone: 'bg-sand-100 text-sand-800',
  },
  cancelled: {
    title: 'Cancelled',
    body: 'This order was cancelled and nothing was charged.',
    tone: 'bg-red-50 text-red-800',
  },
}

function timestampFor(order: Order, status: OrderStatus): string | undefined {
  switch (status) {
    case 'pending':    return order.created_at
    case 'paid':       return order.checkout?.paid_at ?? undefined
    case 'dispatched': return order.dispatched_at
    case 'delivered':  return order.delivered_at
    case 'released':   return order.released_at
    default:           return undefined
  }
}

/**
 * The order's journey, and where the buyer's money is at each step. The same
 * stages as the escrow track on the home page, here with the real amounts.
 */
export function OrderTimeline({ order }: { order: Order }) {
  const current = STATUS_INDEX[order.status] ?? -1
  const exception = EXCEPTIONS[order.status]
  // The last step is finished the moment it is reached
  const finished = order.status === 'released'

  return (
    <div>
      {exception && (
        <div className={cn('mb-5 rounded-lg px-4 py-3', exception.tone)}>
          <p className="text-sm font-bold">{exception.title}</p>
          <p className="text-sm mt-0.5">{exception.body}</p>
        </div>
      )}

      <ol aria-label="Order progress">
        {STEPS.map((step, i) => {
          const done = !exception && (i < current || (finished && i === current))
          const active = !exception && i === current && !finished
          const timestamp = timestampFor(order, step.status)

          return (
            <li key={step.status} className="relative flex gap-3 pb-6 last:pb-0" aria-current={active ? 'step' : undefined}>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('absolute left-[11px] top-6 bottom-0 w-0.5 transition-colors duration-500', done ? 'bg-green-600' : 'bg-sand-200')}
                />
              )}

              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-500',
                  done && 'bg-green-600 border-green-600 text-white',
                  active && 'bg-white border-green-600',
                  !done && !active && 'bg-white border-sand-300',
                )}
              >
                {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                {active && <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />}
              </span>

              <div className="min-w-0 flex-1 -mt-0.5">
                <p className={cn('text-sm', done || active ? 'font-bold text-sand-900' : 'text-sand-600')}>
                  {step.label}
                  <span className="sr-only">{done ? ' (done)' : active ? ' (current step)' : ' (not yet)'}</span>
                </p>
                {(done || active) && (
                  <p className="text-sm text-sand-700 mt-0.5 leading-relaxed">{step.detail(order)}</p>
                )}
                {timestamp && (done || active) && (
                  <p className="nums text-xs text-sand-600 mt-0.5">{formatDateTime(timestamp)}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
