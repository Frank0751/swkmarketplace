'use client'

import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, getProductImageUrl } from '@/lib/utils'
import type { Order } from '@/types'

interface Props {
  order: Order
}

export function OrderCard({ order }: Props) {
  const product = order.product
  const vendor  = order.vendor

  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'bg-sand-100 text-sand-600'

  const primaryImage = product?.images?.[0]
    ? getProductImageUrl(product.images, 0)
    : '/images/product-placeholder.svg'

  return (
    <Link
      href={`/buyer/orders/${order.id}`}
      className="product-card flex items-start gap-4 p-4 group cursor-pointer block"
    >
      {/* Product thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-sand-100 border border-sand-200">
        <img
          src={primaryImage}
          alt={product?.title ?? 'Product'}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={e => {
            (e.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg'
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Reference + date */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-mono font-medium text-sand-500 bg-sand-100 px-2 py-0.5 rounded">
            {order.reference}
          </span>
          <span className="text-xs text-sand-400 flex-shrink-0">
            {formatRelativeTime(order.created_at)}
          </span>
        </div>

        {/* Product title */}
        <p className="text-sm font-semibold text-sand-900 line-clamp-1 mb-0.5">
          {product?.title ?? 'Product unavailable'}
        </p>

        {/* Vendor name */}
        {vendor?.business_name && (
          <p className="text-xs text-sand-500 mb-2">
            by {vendor.business_name}
          </p>
        )}

        {/* Bottom row: price + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-sand-900">
              {formatCurrency(order.total_amount)}
            </span>
            {order.quantity > 1 && (
              <span className="text-xs text-sand-400">
                × {order.quantity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={cn('status-badge text-xs', order.status, statusColor)}>
              {statusLabel}
            </span>
            <ChevronRight className="w-4 h-4 text-sand-300 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}
