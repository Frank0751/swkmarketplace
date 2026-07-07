'use client'

import {
  CreditCard,
  CheckCircle2,
  PackageCheck,
  Truck,
  Home,
  BadgeCheck,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

interface TimelineStep {
  status: OrderStatus
  label: string
  description: string
  icon: React.ElementType
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    status:      'pending',
    label:       'Order Placed',
    description: 'Your order has been placed and is awaiting payment.',
    icon:        CreditCard,
  },
  {
    status:      'paid',
    label:       'Payment Received',
    description: 'Your payment is securely held in escrow by SWK Ghana.',
    icon:        CheckCircle2,
  },
  {
    status:      'confirmed',
    label:       'Vendor Confirmed',
    description: 'The vendor has confirmed availability and is preparing your order.',
    icon:        PackageCheck,
  },
  {
    status:      'dispatched',
    label:       'Dispatched',
    description: 'Your order is on its way to you.',
    icon:        Truck,
  },
  {
    status:      'delivered',
    label:       'Delivery Confirmed',
    description: 'You confirmed receipt of your order.',
    icon:        Home,
  },
  {
    status:      'released',
    label:       'Completed',
    description: 'Payout released to vendor. Transaction complete.',
    icon:        BadgeCheck,
  },
]

// Map status → index in the normal flow
const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  pending:    0,
  paid:       1,
  confirmed:  2,
  dispatched: 3,
  delivered:  4,
  released:   5,
}

// Statuses outside the normal flow
const EXCEPTION_STATUSES: OrderStatus[] = ['disputed', 'refunded', 'cancelled']

function getTimestampForStatus(order: Order, status: OrderStatus): string | undefined {
  switch (status) {
    case 'pending':    return order.created_at
    case 'dispatched': return order.dispatched_at
    case 'delivered':  return order.delivered_at
    case 'released':   return order.released_at
    default:           return undefined
  }
}

interface Props {
  order: Order
}

export function OrderTimeline({ order }: Props) {
  const currentIndex = STATUS_INDEX[order.status] ?? -1
  const isException  = EXCEPTION_STATUSES.includes(order.status)

  return (
    <div className="space-y-0">
      {/* Exception banner */}
      {isException && (
        <div className={cn(
          'mb-6 flex items-start gap-3 p-4 rounded-xl border',
          order.status === 'cancelled' && 'bg-red-50 border-red-100 text-red-700',
          order.status === 'disputed'  && 'bg-gold-50 border-gold-100 text-gold-700',
          order.status === 'refunded'  && 'bg-sand-100 border-sand-200 text-sand-700',
        )}>
          {order.status === 'disputed'  && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {order.status === 'refunded'  && <RefreshCw     className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {order.status === 'cancelled' && <XCircle       className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold text-sm capitalize">{order.status}</p>
            <p className="text-xs mt-0.5 opacity-80">
              {order.status === 'disputed'  && 'A dispute has been raised for this order. SWK Ghana is reviewing.'}
              {order.status === 'refunded'  && 'This order has been refunded. Funds will return to your account.'}
              {order.status === 'cancelled' && 'This order was cancelled.'}
            </p>
          </div>
        </div>
      )}

      {/* Timeline steps */}
      <ol className="relative space-y-0">
        {TIMELINE_STEPS.map((step, idx) => {
          const isDone   = currentIndex > idx
          const isActive = currentIndex === idx && !isException
          const isPending = currentIndex < idx || isException

          const Icon = step.icon
          const timestamp = getTimestampForStatus(order, step.status)

          return (
            <li key={step.status} className="timeline-step relative pb-6 last:pb-0">
              {/* Vertical connector line */}
              {idx < TIMELINE_STEPS.length - 1 && (
                <span
                  className={cn(
                    'absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2',
                    isDone ? 'bg-green-600' : 'bg-sand-200',
                  )}
                  aria-hidden
                />
              )}

              {/* Dot */}
              <div
                className={cn(
                  'timeline-dot',
                  isDone    && 'done',
                  isActive  && 'active',
                  isPending && 'pending',
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="ml-3 min-w-0 flex-1">
                <p className={cn(
                  'text-sm font-semibold leading-none',
                  isDone    && 'text-green-700',
                  isActive  && 'text-gold-600',
                  isPending && 'text-sand-400',
                )}>
                  {step.label}
                </p>

                {(isDone || isActive) && (
                  <p className={cn(
                    'text-xs mt-1',
                    isDone   ? 'text-sand-500' : 'text-sand-600',
                  )}>
                    {step.description}
                  </p>
                )}

                {timestamp && (isDone || isActive) && (
                  <p className="text-xs text-sand-400 mt-1">
                    {formatDateTime(timestamp)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
