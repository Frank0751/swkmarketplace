'use client'

import { useState, useCallback } from 'react'
import { VendorApprovalCard } from '@/components/admin/VendorApprovalCard'
import toast from 'react-hot-toast'
import { Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { VendorProfile, User, VendorStatus } from '@/types'

type VendorWithUser = VendorProfile & { user: User }
type TabValue = VendorStatus | 'all'

interface AdminVendorsClientProps {
  initialVendors: VendorWithUser[]
}

export function AdminVendorsClient({ initialVendors }: AdminVendorsClientProps) {
  const [vendors, setVendors]     = useState<VendorWithUser[]>(initialVendors)
  const [loading, setLoading]     = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>('pending')

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*, user:users(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setVendors((data ?? []) as VendorWithUser[])
    } catch {
      toast.error('Failed to refresh vendors')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleApprove = async (vendorId: string) => {
    const res = await fetch(`/api/vendors/${vendorId}/approve`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to approve vendor')
    }
    toast.success('Vendor approved! Approval email sent.')
    await fetchVendors()
  }

  const handleReject = async (vendorId: string, reason: string) => {
    const res = await fetch(`/api/vendors/${vendorId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to reject vendor')
    }
    toast.success('Vendor rejected. Rejection email sent.')
    await fetchVendors()
  }

  const counts: Record<TabValue, number> = {
    all:       vendors.length,
    pending:   vendors.filter(v => v.status === 'pending').length,
    approved:  vendors.filter(v => v.status === 'approved').length,
    rejected:  vendors.filter(v => v.status === 'rejected').length,
    suspended: vendors.filter(v => v.status === 'suspended').length,
  }

  const filtered = activeTab === 'all' ? vendors : vendors.filter(v => v.status === activeTab)

  const tabs: { label: string; value: TabValue }[] = [
    { label: 'Pending',  value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All',      value: 'all' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-green-600 text-white'
                  : 'bg-sand-100 text-sand-600 hover:bg-sand-200',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full',
                  activeTab === tab.value
                    ? 'bg-white/25 text-white'
                    : 'bg-sand-200 text-sand-600',
                )}
              >
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={fetchVendors}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-sand-600 hover:text-sand-900 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-sand-400">
          <Users className="w-10 h-10 mb-3" />
          <p className="text-base font-medium">No vendors in this category</p>
          <p className="text-sm mt-1">
            {activeTab === 'pending'
              ? 'All vendor applications have been reviewed'
              : `No ${activeTab} vendors found`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(vendor => (
            <VendorApprovalCard
              key={vendor.id}
              vendor={vendor}
              onApprove={() => handleApprove(vendor.id)}
              onReject={(reason) => handleReject(vendor.id, reason)}
            />
          ))}
        </div>
      )}
    </>
  )
}
