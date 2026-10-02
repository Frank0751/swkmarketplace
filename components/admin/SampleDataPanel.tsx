'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { SampleDataStatus } from '@/lib/admin/sample-data'

type Action = 'reset' | 'hide' | 'show'

/**
 * The sample shops let anyone try the marketplace end to end with a test
 * payment. Admins reset them between rehearsals and hide them before launch.
 */
export function SampleDataPanel({ initial }: { initial: SampleDataStatus }) {
  const router = useRouter()
  const [status, setStatus] = useState(initial)
  const [confirm, setConfirm] = useState<Action | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)

  async function run(action: Action) {
    setBusy(action)
    try {
      const res = await fetch('/api/admin/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not update the sample data')
      setStatus(json.status)
      toast.success(json.message)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the sample data')
    } finally {
      setBusy(null)
    }
  }

  if (status.products === 0) return null

  return (
    <section aria-labelledby="sample-data-heading" className="bg-white rounded-xl border-2 border-dashed border-gold-200 p-5 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <h2 id="sample-data-heading" className="flex flex-wrap items-center gap-2 text-sm font-bold text-sand-900">
              Sample shops
              <span className={status.visible
                ? 'text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5'
                : 'text-[11px] font-semibold text-sand-600 bg-sand-100 border border-sand-200 rounded-full px-2 py-0.5'}
              >
                {status.visible ? 'Visible to shoppers' : 'Hidden'}
              </span>
            </h2>
            <p className="text-xs text-sand-600 mt-1 leading-relaxed">
              {status.products} sample products in 4 shops. {status.orders} sample order{status.orders === 1 ? '' : 's'}
              {status.open_orders > 0 ? ` (${status.open_orders} in progress)` : ''}, paid with the test payment: no
              money moved, but they’re counted in the figures on this page. Reset before a demo; hide before launch.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirm('reset')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-sand-200 bg-white text-sm font-semibold text-sand-800 hover:bg-sand-50 disabled:opacity-60 transition-colors"
          >
            {busy === 'reset' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-4 h-4" aria-hidden="true" />}
            Reset sample data
          </button>
          <button
            type="button"
            onClick={() => (status.visible ? setConfirm('hide') : run('show'))}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-sand-200 bg-white text-sm font-semibold text-sand-800 hover:bg-sand-50 disabled:opacity-60 transition-colors"
          >
            {busy === 'hide' || busy === 'show'
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              : status.visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            {status.visible ? 'Hide sample shops' : 'Show sample shops'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('reset')}
        title="Reset the sample data?"
        description="Deletes every sample order, with its payout, history and review, and restores the sample products’ stock. Real shops, products and orders are not touched."
        details={[
          { label: 'Sample orders removed', value: String(status.orders), emphasis: true },
          { label: 'Sample shops', value: status.visible ? 'Stay visible' : 'Shown again' },
        ]}
        confirmLabel="Reset sample data"
        tone="danger"
      />
      <ConfirmDialog
        open={confirm === 'hide'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('hide')}
        title="Hide the sample shops?"
        description="Shoppers will no longer see the sample shops or their products. Past sample orders stay in the records, and you can show the shops again at any time."
        confirmLabel="Hide sample shops"
      />
    </section>
  )
}
