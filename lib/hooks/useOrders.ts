'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/types'

export interface UseOrdersParams {
  role: 'buyer' | 'vendor'
  userId?: string       // buyer's user id
  vendorId?: string     // vendor_profiles.id (NOT user id)
  status?: OrderStatus
  limit?: number
}

interface UseOrdersReturn {
  orders: Order[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useOrders({
  role,
  userId,
  vendorId,
  status,
  limit = 50,
}: UseOrdersParams): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    async function fetchOrders() {
      const supabase = createClient()

      let query = supabase
        .from('orders')
        .select(
          `
          *,
          product:products (
            id, title, slug, images, price_ghs, unit
          ),
          vendor:vendor_profiles (
            id, business_name, logo_url, phone
          ),
          buyer:users!orders_buyer_id_fkey (
            id, full_name, email, phone
          ),
          payout:payouts (
            id, gross_amount, commission_rate, commission_amount, net_amount, status, released_at
          )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      // Role-based filter
      if (role === 'buyer' && userId) {
        query = query.eq('buyer_id', userId)
      } else if (role === 'vendor' && vendorId) {
        query = query.eq('vendor_id', vendorId)
      }

      // Optional status filter
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: dbErr } = await query

      if (!isMounted) return

      if (dbErr) {
        setError(dbErr.message)
        setOrders([])
      } else {
        setOrders((data as Order[]) || [])
        setError(null)
      }
      setLoading(false)
    }

    // Only fetch if we have a meaningful identity
    if ((role === 'buyer' && userId) || (role === 'vendor' && vendorId)) {
      fetchOrders()
    } else {
      setOrders([])
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [role, userId, vendorId, status, limit, tick])

  return { orders, loading, error, refetch }
}
