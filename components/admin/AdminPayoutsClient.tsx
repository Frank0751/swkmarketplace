'use client'

import { useState, useCallback } from 'react'
import { PayoutPanel } from '@/components/admin/PayoutPanel'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Payout } from '@/types'

interface AdminPayoutsClientProps {
  initialPayouts: Payout[]
}

export function AdminPayoutsClient({ initialPayouts }: AdminPayoutsClientProps) {
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts)
  const [loading, setLoading] = useState(false)

  const fetchPayouts = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          order:orders(id, reference, status),
          vendor:vendor_profiles(id, business_name, user:users(email, full_name))
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPayouts((data ?? []) as Payout[])
    } catch {
      toast.error('Failed to refresh payouts')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <PayoutPanel payouts={payouts} />
    </>
  )
}
