'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VendorProfile } from '@/types'

interface UseVendorReturn {
  vendor: VendorProfile | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useVendor(): UseVendorReturn {
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    const supabase = createClient()

    async function fetchVendor() {
      // Get current auth user first
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!isMounted) return

      if (!authUser) {
        setVendor(null)
        setLoading(false)
        return
      }

      const { data, error: dbErr } = await supabase
        .from('vendor_profiles')
        .select(
          `
          *,
          user:users (
            id, full_name, email, avatar_url, phone
          )
        `,
        )
        .eq('user_id', authUser.id)
        .single()

      if (!isMounted) return

      if (dbErr) {
        // PGRST116 = no rows returned (vendor profile doesn't exist yet)
        if (dbErr.code === 'PGRST116') {
          setVendor(null)
          setError(null)
        } else {
          setError(dbErr.message)
          setVendor(null)
        }
      } else {
        setVendor(data as VendorProfile)
        setError(null)
      }
      setLoading(false)
    }

    fetchVendor()

    // Re-fetch on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        setLoading(true)
        fetchVendor()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [tick])

  return { vendor, loading, error, refetch }
}
