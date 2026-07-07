'use client'

import { useState } from 'react'
import { Wallet, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import type { Payout, PayoutStatus } from '@/types'

interface PayoutPanelProps {
  payouts: Payout[]
}

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string }> = {
  held:            { label: 'Held in Escrow',   color: 'bg-teal-50 text-teal-700' },
  pending_release: { label: 'Pending Release',   color: 'bg-gold-50 text-gold-700' },
  released:        { label: 'Released',          color: 'bg-green-50 text-green-700' },
  failed:          { label: 'Failed',            color: 'bg-red-50 text-red-700' },
}

type FilterStatus = PayoutStatus | 'all'

export function PayoutPanel({ payouts: initialPayouts }: PayoutPanelProps) {
  const [payouts, setPayouts]         = useState<Payout[]>(initialPayouts)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [loading, setLoading]         = useState<Record<string, boolean>>({})

  const filtered = filterStatus === 'all'
    ? payouts
    : payouts.filter(p => p.status === filterStatus)

  // Totals
  const totalHeld = payouts
    .filter(p => p.status === 'held' || p.status === 'pending_release')
    .reduce((sum, p) => sum + p.gross_amount, 0)

  const totalReleased = payouts
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.net_amount, 0)

  const totalCommission = payouts
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.commission_amount, 0)

  const handleRelease = async (payoutId: string) => {
    setLoading(prev => ({ ...prev, [payoutId]: true }))
    try {
      const res = await fetch(`/api/payouts/${payoutId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to release payout')
      }

      const data = await res.json()
      setPayouts(prev =>
        prev.map(p => p.id === payoutId ? { ...p, ...data.payout } : p),
      )
      toast.success('Payout released successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setLoading(prev => ({ ...prev, [payoutId]: false }))
    }
  }

  const filterTabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',             value: 'all' },
    { label: 'Held',            value: 'held' },
    { label: 'Pending Release', value: 'pending_release' },
    { label: 'Released',        value: 'released' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Total Held (Escrow)</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalHeld)}</div>
            <div className="text-xs text-sand-400 mt-0.5">
              {payouts.filter(p => p.status === 'held' || p.status === 'pending_release').length} payouts
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Total Released</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalReleased)}</div>
            <div className="text-xs text-sand-400 mt-0.5">
              {payouts.filter(p => p.status === 'released').length} payouts
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-gold-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-sand-500">Commission Earned</div>
            <div className="text-xl font-bold text-sand-900 mt-0.5">{formatCurrency(totalCommission)}</div>
            <div className="text-xs text-sand-400 mt-0.5">15% of released payouts</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
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
          <div className="flex flex-col items-center justify-center py-16 text-sand-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">No payouts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden md:table-cell">Order Ref</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Gross</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden lg:table-cell">Commission (15%)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Net Payout</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filtered.map(payout => {
                  const statusCfg = STATUS_CONFIG[payout.status]
                  const canRelease = payout.status === 'held' || payout.status === 'pending_release'

                  return (
                    <tr key={payout.id} className="hover:bg-sand-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sand-900">
                          {payout.vendor?.business_name ?? '-'}
                        </div>
                        <div className="text-xs text-sand-400">
                          {payout.vendor?.user?.email ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs text-green-700 font-semibold">
                          {payout.order?.reference ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-sand-700">
                        {formatCurrency(payout.gross_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-sand-500 hidden lg:table-cell">
                        -{formatCurrency(payout.commission_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatCurrency(payout.net_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                            statusCfg.color,
                          )}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-sand-400 hidden md:table-cell">
                        {payout.released_at
                          ? formatDate(payout.released_at)
                          : formatRelativeTime(payout.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {canRelease && (
                          <button
                            onClick={() => handleRelease(payout.id)}
                            disabled={loading[payout.id]}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            {loading[payout.id] ? 'Releasing…' : 'Release'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
