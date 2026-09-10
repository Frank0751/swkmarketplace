'use client'

import { useState, Fragment } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, Phone, Clock, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatCurrency, formatDate, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { ORDER_TRANSITIONS, CONFIRMATION_WINDOW_DAYS, isConfirmationOverdue } from '@/lib/marketplace/orders'
import { formatGhanaPhone } from '@/lib/marketplace/phone'
import type { Order, OrderStatus } from '@/types'

interface OrderManagementProps {
  orders: Order[]
}

type FilterValue = OrderStatus | 'all' | 'attention'

/** What each admin action does, shown before the admin commits to it */
const ACTION_HINTS: Partial<Record<OrderStatus, string>> = {
  paid:      'Only for a payment received outside Paystack (e.g. mobile money sent to SWK directly).',
  delivered: 'Confirms delivery for the buyer and queues the vendor’s payout for release. Check with both sides first.',
  refunded:  'Refund the buyer in your Paystack dashboard first. This returns the stock, cancels the vendor’s payout and emails the buyer.',
  disputed:  'Puts the order on hold while you look into it. The payout can’t be released until it is resolved.',
  cancelled: 'Cancels an unpaid order.',
}

function needsAttention(order: Order): boolean {
  return order.status === 'disputed' || isConfirmationOverdue(order)
}

export function OrderManagement({ orders: initialOrders }: OrderManagementProps) {
  const [orders, setOrders]             = useState<Order[]>(initialOrders)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [filter, setFilter]             = useState<FilterValue>('all')
  const [adminNotes, setAdminNotes]     = useState<Record<string, string>>({})
  const [pendingStatus, setPendingStatus] = useState<Record<string, OrderStatus>>({})
  const [loading, setLoading]           = useState<Record<string, boolean>>({})

  const filtered = filter === 'all'
    ? orders
    : filter === 'attention'
      ? orders.filter(needsAttention)
      : orders.filter(o => o.status === filter)

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const attentionCount = orders.filter(needsAttention).length

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

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update order')

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

  const filterTabs: { label: string; value: FilterValue; count?: number }[] = [
    { label: 'All',             value: 'all',        count: orders.length },
    { label: 'Needs attention', value: 'attention',  count: attentionCount },
    { label: 'Awaiting payment', value: 'pending',   count: statusCounts.pending },
    { label: 'Paid',            value: 'paid',       count: statusCounts.paid },
    { label: 'Confirmed',       value: 'confirmed',  count: statusCounts.confirmed },
    { label: 'Dispatched',      value: 'dispatched', count: statusCounts.dispatched },
    { label: 'Delivered',       value: 'delivered',  count: statusCounts.delivered },
    { label: 'Released',        value: 'released',   count: statusCounts.released },
    { label: 'Disputed',        value: 'disputed',   count: statusCounts.disputed },
    { label: 'Refunded',        value: 'refunded',   count: statusCounts.refunded },
  ]

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Filter orders">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            aria-pressed={filter === tab.value}
            className={cn(
              'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === tab.value
                ? 'bg-green-600 text-white'
                : tab.value === 'attention' && attentionCount > 0
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-sand-100 text-sand-600 hover:bg-sand-200',
            )}
          >
            {tab.label}
            {tab.count ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-sand-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sand-600">
            <AlertCircle className="w-8 h-8 mb-2" aria-hidden="true" />
            <p className="text-sm font-medium">
              {filter === 'attention' ? 'Nothing needs attention right now' : 'No orders found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Reference</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Buyer</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden lg:table-cell">Vendor</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden xl:table-cell">Product</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Total</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-sand-600 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th scope="col" className="px-4 py-3 w-8"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filtered.map(order => {
                  const isExpanded = expandedId === order.id
                  const transitions = ORDER_TRANSITIONS.admin[order.status] ?? []
                  const overdue = isConfirmationOverdue(order)
                  const selected = pendingStatus[order.id]
                  const noteId = `admin-note-${order.id}`
                  const selectId = `new-status-${order.id}`

                  return (
                    /* Keyed Fragment: the key was on the inner <tr>, so React
                       reconciled these by index and expanded-row state could
                       attach to the wrong order after a filter change. */
                    <Fragment key={order.id}>
                      <tr
                        className="hover:bg-sand-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-green-700">
                          {order.reference}
                        </td>
                        <td className="px-4 py-3 text-sand-700">
                          <div className="font-medium">{order.buyer?.full_name ?? '-'}</div>
                          <div className="text-xs text-sand-600">{order.buyer?.email}</div>
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
                          <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', ORDER_STATUS_COLORS[order.status])}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          {overdue && (
                            <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              Unconfirmed {CONFIRMATION_WINDOW_DAYS}+ days
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-sand-600 hidden md:table-cell">
                          {formatRelativeTime(order.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sand-600">
                          {/* A real button: the row's onClick alone left the
                              status controls in the expanded row unreachable
                              by keyboard. */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              setExpandedId(isExpanded ? null : order.id)
                            }}
                            aria-expanded={isExpanded}
                            className="w-11 h-11 -m-3 flex items-center justify-center rounded-lg hover:bg-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
                              : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                            <span className="sr-only">
                              {isExpanded ? 'Hide' : 'Show'} details for order {order.reference}
                            </span>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-4 pb-4 bg-sand-50 border-b border-sand-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                              {/* Order details */}
                              <div className="space-y-2 text-sm">
                                <h4 className="font-semibold text-sand-700 text-xs uppercase tracking-wider">
                                  Order Details
                                </h4>
                                <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-sand-600">Date placed</span>
                                    <span className="text-sand-700">{formatDate(order.created_at)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-600">Quantity</span>
                                    <span className="text-sand-700">{order.quantity}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-600">Unit price</span>
                                    <span className="text-sand-700">{formatCurrency(order.unit_price)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sand-600">Delivery fee</span>
                                    <span className="text-sand-700">{formatCurrency(order.delivery_fee)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-sand-200 pt-1.5 font-semibold">
                                    <span className="text-sand-600">Total</span>
                                    <span className="text-sand-900">{formatCurrency(order.total_amount)}</span>
                                  </div>
                                  {order.dispatched_at && (
                                    <div className="flex justify-between">
                                      <span className="text-sand-600">Dispatched</span>
                                      <span className="text-sand-700">{formatDate(order.dispatched_at)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-1.5 text-xs">
                                  <div className="text-sand-600 font-medium">Deliver to</div>
                                  <div className="text-sand-700">{order.delivery_address}</div>
                                  <div className="text-sand-600">{order.delivery_region}</div>
                                  {order.delivery_phone && (
                                    <a
                                      href={`tel:${order.delivery_phone}`}
                                      className="inline-flex items-center gap-1 text-green-700 font-medium hover:underline"
                                    >
                                      <Phone className="w-3 h-3" aria-hidden="true" />
                                      {formatGhanaPhone(order.delivery_phone)}
                                    </a>
                                  )}
                                </div>

                                {order.buyer_notes && (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 text-xs">
                                    <div className="text-sand-600 font-medium mb-1">Buyer notes</div>
                                    <div className="text-sand-700">{order.buyer_notes}</div>
                                  </div>
                                )}

                                {order.vendor_notes && (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 text-xs">
                                    <div className="text-sand-600 font-medium mb-1">Vendor notes</div>
                                    <div className="text-sand-700">{order.vendor_notes}</div>
                                  </div>
                                )}
                              </div>

                              {/* Status update */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sand-700 text-xs uppercase tracking-wider">
                                  Update Status
                                </h4>

                                {overdue && (
                                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <p>
                                      Dispatched over {CONFIRMATION_WINDOW_DAYS} days ago and the buyer hasn&rsquo;t
                                      confirmed or reported a problem. Under the Terms you may confirm delivery for
                                      them once you&rsquo;ve checked with the vendor and tried to reach the buyer.
                                    </p>
                                  </div>
                                )}

                                {transitions.length > 0 ? (
                                  <div className="bg-white rounded-lg border border-sand-200 p-3 space-y-3">
                                    <div>
                                      <label htmlFor={selectId} className="text-xs font-medium text-sand-600 mb-1 block">
                                        New status
                                      </label>
                                      <select
                                        id={selectId}
                                        value={selected ?? ''}
                                        onChange={e =>
                                          setPendingStatus(prev => ({
                                            ...prev,
                                            [order.id]: e.target.value as OrderStatus,
                                          }))
                                        }
                                        className="w-full min-h-[44px] px-3 py-2 text-sm border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                                      >
                                        <option value="">- select status -</option>
                                        {transitions.map(s => (
                                          <option key={s} value={s}>
                                            {ORDER_STATUS_LABELS[s]}
                                          </option>
                                        ))}
                                      </select>
                                      {selected && ACTION_HINTS[selected] && (
                                        <p className="mt-2 flex items-start gap-1.5 text-xs text-sand-700">
                                          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-teal-600" aria-hidden="true" />
                                          {ACTION_HINTS[selected]}
                                        </p>
                                      )}
                                    </div>

                                    <div>
                                      <label htmlFor={noteId} className="text-xs font-medium text-sand-600 mb-1 block">
                                        Admin note (optional, internal)
                                      </label>
                                      <textarea
                                        id={noteId}
                                        value={adminNotes[order.id] ?? ''}
                                        onChange={e =>
                                          setAdminNotes(prev => ({
                                            ...prev,
                                            [order.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="e.g. Called the buyer on 12 Sept, confirmed received"
                                        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                                        rows={2}
                                      />
                                    </div>

                                    <button
                                      onClick={() => handleStatusUpdate(order.id)}
                                      disabled={!selected || loading[order.id]}
                                      className="w-full min-h-[44px] py-2 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                      {loading[order.id] ? 'Updating…' : 'Update Status'}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bg-sand-50 rounded-lg border border-sand-200 p-3 text-xs text-sand-600">
                                    {order.status === 'delivered'
                                      ? 'Delivery is confirmed. Release the vendor’s payout from the Payouts page.'
                                      : 'No further status changes are available for this order.'}
                                  </div>
                                )}

                                {order.admin_notes && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                                    <div className="text-amber-700 font-medium mb-1">Admin notes</div>
                                    <div className="text-amber-800 whitespace-pre-wrap">{order.admin_notes}</div>
                                  </div>
                                )}

                                {order.paystack_reference && (
                                  <div className="text-xs text-sand-600">
                                    Paystack ref: <span className="font-mono">{order.paystack_reference}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
