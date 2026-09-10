'use client'

import { useState, useCallback } from 'react'
import { PayoutPanel } from '@/components/admin/PayoutPanel'
import { createClient } from '@/lib/supabase/client'
import { loadAdminPayouts, type AdminPayout } from '@/lib/admin/payouts'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminPayoutsClientProps {
  initialPayouts: AdminPayout[]
}

export function AdminPayoutsClient({ initialPayouts }: AdminPayoutsClientProps) {
  const [payouts, setPayouts] = useState<AdminPayout[]>(initialPayouts)
  const [loading, setLoading] = useState(false)

  const fetchPayouts = useCallback(async () => {
    setLoading(true)
    try {
      setPayouts(await loadAdminPayouts(createClient()))
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
          className="inline-flex items-center gap-2 min-h-[44px] px-3 text-sm font-medium text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <PayoutPanel payouts={payouts} />
    </>
  )
}
