'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatCurrency, formatDate, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

interface OrderManagementProps {
  orders: Order[]
}

const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['paid', 'cancelled'],
  paid:       ['confirmed', 'refunded', 'disputed'],
  confirmed:  ['dispatched', 'disputed'],
  dispatched: ['delivered', 'disputed'],
  delivered:  ['released'],
  released:   [],
  disputed:   ['refunded', 'released'],
  refunded:   [],
  cancelled:  [],
}

type FilterStatus = OrderStatus | 'all'

export function OrderManagement({ orders: initialOrders }: OrderManagementProps) {
  const [orders, setOrders]           = useState<Order[]>(initialOrders)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [adminNotes, setAdminNotes]   = useState<Record<string, string>>({})
  const [pendingStatus, setPendingStatus] = useState<Record<string, OrderStatus>>({})
  const [loading, setLoading]         = useState<Record<string, boolean>>({})

  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus)

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleStatusUpdate = async (orderId: string) => {
    const newStatus = pendingStatus[orderId]
    if (!newStatus) return

    setLoading(prev => ({ ...prev, [orderId]: true }))
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: adminNotes[orderId] || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update order')
      }

      const data = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data.data } : o))
      setPendingStatus(prev => { const n = { ...prev }; delete n[orderId]; return n })
      setAdminNotes(prev => { const n = { ...prev }; delete n[orderId]; return n })
      toast.success(`Order updated to "${ORDER_STATUS_LABELS[newStatus]}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setLoading(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const filterTabs: { label: string; value: FilterStatus }[] = [
    { label: 'All',        value: 'all' },
    { label: 'Paid',       value: 'paid' },
    { label: 'Confirmed',  value: 'confirmed' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Delivered',  value: 'delivered' },
    { label: 'Released',   value: 'released' },
    { label: 'Disputed',   value: 'disputed' },
  ]

  return (
    <div className="space-y-4">
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
            {tab.value !== 'all' && statusCounts[tab.value]
              ? ` (${statusCounts[tab.value]})`
              : tab.value === 'all' ? ` (${orders.length})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sand-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Buyer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden lg:table-cell">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden xl:table-cell">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-sand-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filtered.map(order => {
                  const isExpanded = expandedId === order.id
                  const transitions = ADMIN_STATUS_TRANSITIONS[order.status] ?? []

                  return (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-sand-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-green-700">
                          {order.reference}
                        </td>
                        <td className="px-4 py-3 text-sand-700">
                          <div className="font-medium">{order.buyer?.full_name ?? '-'}</div>
                          <div className="text-xs text-sand-400">{order.buyer?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sand-600 hidden lg:table-cell">
                          {order.vendor?.business_name ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sand-600 hidden xl:table-cell max-w-xs truncate">
                          {order.product?.title ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-sand-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                              ORDER_STATUS_COLORS[order.status],
                            )}
                          >
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-sand-400 hidden md:table-cell">
                          {formatRelativeTime(order.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sand-400">
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`}>
                          <td colSpan={8} className="px-4 pb-4 bg-sand-50 border-b border-sand-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                              {/* Order details */}
                              <div className="space-y-2 text-sm">
                                <h4 className="font-semibold text-sand-700 text-xs uppercase tracking-wider">
                                  Order Details
                                </h4>
                                <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-sand-500">Order ID</span>
                                    <span className="font-mono text-sand-700">{order.id.slice(0, 8)}…</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-500">Date placed</span>
                                    <span className="text-sand-700">{formatDate(order.created_at)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-500">Quantity</span>
                                    <span className="text-sand-700">{order.quantity}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-500">Unit price</span>
                                    <span className="text-sand-700">{formatCurrency(order.unit_price)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-500">Delivery fee</span>
                                    <span className="text-sand-700">{formatCurrency(order.delivery_fee)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-sand-200 pt-1.5 font-semibold">
                                    <span className="text-sand-600">Total</span>
                                    <span className="text-sand-900">{formatCurrency(order.total_amount)}</span>
                                  </div>
                                </div>

                                <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-1.5 text-xs">
                                  <div className="text-sand-500 font-medium">Delivery address</div>
                                  <div className="text-sand-700">{order.delivery_address}</div>
                                  <div className="text-sand-500">{order.delivery_region}</div>
                                </div>

                                {order.buyer_notes && (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 text-xs">
                                    <div className="text-sand-500 font-medium mb-1">Buyer notes</div>
                                    <div className="text-sand-700">{order.buyer_notes}</div>
                                  </div>
                                )}

                                {order.vendor_notes && (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 text-xs">
                                    <div className="text-sand-500 font-medium mb-1">Vendor notes</div>
                                    <div className="text-sand-700">{order.vendor_notes}</div>
                                  </div>
                                )}
                              </div>

                              {/* Status update */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sand-700 text-xs uppercase tracking-wider">
                                  Update Status
                                </h4>

                                {transitions.length > 0 ? (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-3">
                                    <div>
                                      <label className="text-xs font-medium text-sand-600 mb-1 block">
                                        New status
                                      </label>
                                      <select
                                        value={pendingStatus[order.id] ?? ''}
                                        onChange={e =>
                                          setPendingStatus(prev => ({
                                            ...prev,
                                            [order.id]: e.target.value as OrderStatus,
                                          }))
                                        }
                                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                                      >
                                        <option value="">- select status -</option>
                                        {transitions.map(s => (
                                          <option key={s} value={s}>
                                            {ORDER_STATUS_LABELS[s]}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-xs font-medium text-sand-600 mb-1 block">
                                        Admin note (optional)
                                      </label>
                                      <textarea
                                        value={adminNotes[order.id] ?? ''}
                                        onChange={e =>
                                          setAdminNotes(prev => ({
                                            ...prev,
                                            [order.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Internal note about this status change..."
                                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                                        rows={2}
                                      />
                                    </div>

                                    <button
                                      onClick={() => handleStatusUpdate(order.id)}
                                      disabled={!pendingStatus[order.id] || loading[order.id]}
                                      className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                      {loading[order.id] ? 'Updating…' : 'Update Status'}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bg-sand-50 rounded-lg border border-sand-200 p-3 text-xs text-sand-500">
                                    No further status transitions available for this order.
                                  </div>
                                )}

                                {order.admin_notes && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                                    <div className="text-amber-700 font-medium mb-1">Admin notes</div>
                                    <div className="text-amber-800">{order.admin_notes}</div>
                                  </div>
                                )}

                                {order.paystack_reference && (
                                  <div className="text-xs text-sand-400">
                                    Paystack ref: <span className="font-mono">{order.paystack_reference}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
