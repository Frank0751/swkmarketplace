'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, TrendingUp, Smartphone, Landmark, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { describePayoutDestination, type AdminPayout } from '@/lib/admin/payouts'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { PayoutStatus } from '@/types'

interface PayoutPanelProps {
  payouts: AdminPayout[]
}

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string }> = {
  held:            { label: 'Held in escrow',       color: 'bg-teal-50 text-teal-700' },
  pending_release: { label: 'Ready to release',     color: 'bg-gold-50 text-gold-700' },
  released:        { label: 'Released',             color: 'bg-green-50 text-green-700' },
  failed:          { label: 'Failed',               color: 'bg-red-50 text-red-700' },
  cancelled:       { label: 'Cancelled (refunded)', color: 'bg-sand-100 text-sand-600' },
}

type FilterStatus = PayoutStatus | 'all'

/**
 * Escrow rule: a payout can be released once delivery is confirmed. The API
 * enforces this too; showing it here saves an admin a failed click.
 */
function releaseState(p: AdminPayout): { canRelease: boolean; waiting?: string } {
  if (p.status === 'pending_release') return { canRelease: true }
  if (p.status === 'held') {
    if (p.order?.status === 'delivered') return { canRelease: true }
    return {
      canRelease: false,
      waiting: p.order?.status === 'disputed' ? 'On hold: problem reported' : 'Waiting for delivery',
    }
  }
  return { canRelease: false }
}

export function PayoutPanel({ payouts: initialPayouts }: PayoutPanelProps) {
  const [payouts, setPayouts]           = useState<AdminPayout[]>(initialPayouts)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [loading, setLoading]           = useState<Record<string, boolean>>({})
  // The payout awaiting confirmation, so the dialog can restate who gets paid
  // what, and where, before it is marked released.
  const [pendingRelease, setPendingRelease] = useState<AdminPayout | null>(null)

  // Refresh replaces the list; without this the panel kept showing the
  // payouts it was first rendered with
  useEffect(() => setPayouts(initialPayouts), [initialPayouts])

  const filtered = filterStatus === 'all'
    ? payouts
    : payouts.filter(p => p.status === filterStatus)

  const totalHeld = payouts
    .filter(p => p.status === 'held' || p.status === 'pending_release')
    .reduce((sum, p) => sum + p.gross_amount, 0)

  const totalReleased = payouts
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.net_amount, 0)

  const totalCommission = payouts
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.commission_amount, 0)

  const readyCount = payouts.filter(p => releaseState(p).canRelease).length

  const handleRelease = async (payoutId: string) => {
    setLoading(prev => ({ ...prev, [payoutId]: true }))
    try {
      const res = await fetch(`/api/payouts/${payoutId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to release payout')

      setPayouts(prev =>
        prev.map(p => p.id === payoutId ? { ...p, ...data.payout } : p),
      )
      toast.success('Payout marked as released. The vendor has been emailed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setLoading(prev => ({ ...prev, [payoutId]: false }))
    }
  }

  const filterTabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',              value: 'all' },
    { label: 'Ready to release', value: 'pending_release' },
    { label: 'Held',             value: 'held' },
    { label: 'Released',         value: 'released' },
    { label: 'Cancelled',        value: 'cancelled' },
  ]

  const destination = describePayoutDestination(pendingRelease?.vendor?.payout_details)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-teal-600" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-600">Held in escrow</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalHeld)}</div>
            <div className="text-xs text-sand-600 mt-0.5">
              {readyCount > 0 ? `${readyCount} ready to release` : 'None ready to release'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-600">Paid to vendors</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalReleased)}</div>
            <div className="text-xs text-sand-600 mt-0.5">
              {payouts.filter(p => p.status === 'released').length} payouts
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-gold-600" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-600">Commission earned</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalCommission)}</div>
            <div className="text-xs text-sand-600 mt-0.5">15% of released payouts</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-sand-600 leading-relaxed">
        Send each vendor their share to the account shown, then press <strong>Release</strong> to
        record it and email them. Payouts become releasable once delivery is confirmed.
      </p>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Filter payouts">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            aria-pressed={filterStatus === tab.value}
            className={cn(
              'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filterStatus === tab.value
                ? 'bg-green-600 text-white'
                : 'bg-sand-100 text-sand-600 hover:bg-sand-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payouts table */}
      <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sand-600">
            <AlertCircle className="w-8 h-8 mb-2" aria-hidden="true" />
            <p className="text-sm font-medium">No payouts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Vendor &amp; pay to</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden md:table-cell">Order Ref</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden lg:table-cell">Gross</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden lg:table-cell">Commission (15%)</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Vendor gets</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filtered.map(payout => {
                  const statusCfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.held
                  const { canRelease, waiting } = releaseState(payout)
                  const details = payout.vendor?.payout_details
                  const dest = describePayoutDestination(details)
                  const DestIcon = details?.method === 'bank' ? Landmark : Smartphone

                  return (
                    <tr key={payout.id} className="hover:bg-sand-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sand-900">
                          {payout.vendor?.business_name ?? '-'}
                        </div>
                        <div className="text-xs text-sand-600">
                          {payout.vendor?.user?.email ?? ''}
                        </div>
                        {dest ? (
                          <div className="mt-1 flex items-center gap-1 text-xs text-sand-700">
                            <DestIcon className="w-3.5 h-3.5 flex-shrink-0 text-teal-600" aria-hidden="true" />
                            <span>{dest}</span>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            No payout details yet
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs text-green-700 font-semibold">
                          {payout.order?.reference ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-sand-700 hidden lg:table-cell">
                        {formatCurrency(payout.gross_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-sand-600 hidden lg:table-cell">
                        -{formatCurrency(payout.commission_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatCurrency(payout.net_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-sand-600 hidden md:table-cell">
                        {payout.released_at
                          ? formatDate(payout.released_at)
                          : formatRelativeTime(payout.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {canRelease ? (
                          <button
                            onClick={() => setPendingRelease(payout)}
                            disabled={loading[payout.id]}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                          >
                            <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                            {loading[payout.id] ? 'Releasing…' : 'Release'}
                          </button>
                        ) : waiting ? (
                          <span className="text-xs text-sand-600 whitespace-nowrap">{waiting}</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingRelease}
        onClose={() => setPendingRelease(null)}
        onConfirm={async () => {
          if (pendingRelease) await handleRelease(pendingRelease.id)
        }}
        title="Mark this payout as released?"
        description="Do this after you have sent the money. The vendor gets an email saying it is on its way."
        details={pendingRelease ? [
          { label: 'Vendor',           value: pendingRelease.vendor?.business_name ?? '—' },
          { label: 'Send to',          value: destination ?? 'No payout details on file' },
          { label: 'Gross',            value: formatCurrency(pendingRelease.gross_amount) },
          { label: 'Commission (15%)', value: `-${formatCurrency(pendingRelease.commission_amount)}` },
          { label: 'Vendor receives',  value: formatCurrency(pendingRelease.net_amount), emphasis: true },
        ] : []}
        warning={destination
          ? 'This is final and cannot be reversed from the admin panel.'
          : 'This vendor has not added payout details. Only continue if you have paid them another way.'}
        confirmLabel="Yes, it's been sent"
      />
    </div>
  )
}
