'use client'

import { useState } from 'react'
import { FlaskConical, Loader2, PackageCheck, Truck, Wallet, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { OrderStatus } from '@/types'

type Action = 'confirm' | 'dispatch' | 'release'

const STEP: Partial<Record<OrderStatus, { action: Action; label: string; role: string; help: string; Icon: typeof Truck; done: string }>> = {
  paid: {
    action: 'confirm',
    label: 'Confirm the order',
    role: 'the shop',
    help: 'A real shop confirms within 24 hours that it can fulfil the order.',
    Icon: PackageCheck,
    done: 'The shop confirmed your order',
  },
  confirmed: {
    action: 'dispatch',
    label: 'Dispatch the order',
    role: 'the shop',
    help: 'A real shop calls you, then sends your order out for delivery.',
    Icon: Truck,
    done: 'Your order is on its way',
  },
  delivered: {
    action: 'release',
    label: 'Release the payout',
    role: 'SWK Ghana',
    help: 'With delivery confirmed, SWK Ghana pays the shop its share (85%).',
    Icon: Wallet,
    done: 'Payout released to the shop',
  },
}

/**
 * Sample shops have no one behind them to confirm or dispatch an order. These
 * controls let whoever is demonstrating the marketplace play their part, so
 * the whole journey can be shown from one screen.
 */
export function SampleOrderControls({
  orderId,
  status,
  onChanged,
}: {
  orderId: string
  status: OrderStatus
  onChanged: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const step = STEP[status]

  async function run(action: Action, done: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not update the sample order.')
      toast.success(done)
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the sample order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="sample-controls-heading"
      className="rounded-xl border-2 border-dashed border-gold-200 bg-gold-50/60 p-4"
    >
      <h2 id="sample-controls-heading" className="flex items-center gap-2 text-sm font-semibold text-gold-900">
        <FlaskConical className="w-4 h-4 text-gold-600" aria-hidden="true" />
        Sample order: demo controls
      </h2>

      {step ? (
        <>
          <p className="text-xs text-gold-900 mt-1 leading-relaxed">
            Play {step.role} to move this order on. {step.help}
          </p>
          <button
            type="button"
            onClick={() => run(step.action, step.done)}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-sand-900 text-white text-sm font-semibold hover:bg-sand-800 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-900 focus-visible:ring-offset-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <step.Icon className="w-4 h-4" aria-hidden="true" />}
            {step.label} <span className="font-normal opacity-80">(as {step.role})</span>
          </button>
        </>
      ) : status === 'dispatched' ? (
        <p className="text-xs text-gold-900 mt-1 leading-relaxed">
          Now it’s your turn as the buyer: once the order “arrives”, use <strong>Confirm delivery</strong> above.
          That releases the escrow for SWK Ghana to pay the shop.
        </p>
      ) : status === 'released' ? (
        <p className="flex items-start gap-1.5 text-xs text-gold-900 mt-1 leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" aria-hidden="true" />
          This sample order went through every step a real order does. You can now leave a review on the product page.
        </p>
      ) : status === 'disputed' ? (
        <p className="text-xs text-gold-900 mt-1 leading-relaxed">
          A problem was reported. An admin resolves it from Admin, Orders, by marking it delivered or refunded.
        </p>
      ) : (
        <p className="text-xs text-gold-900 mt-1">No money moves for sample orders.</p>
      )}
    </section>
  )
}
