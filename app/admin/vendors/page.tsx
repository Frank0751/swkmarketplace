import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminVendorsClient } from '@/components/admin/AdminVendorsClient'
import { createClient } from '@/lib/supabase/server'
import type { VendorProfile, User } from '@/types'

export const metadata = { title: 'Vendor Management' }
export const dynamic = 'force-dynamic'

type VendorWithUser = VendorProfile & { user: User }

async function getVendors(): Promise<VendorWithUser[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('vendor_profiles')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })
  return (data ?? []) as VendorWithUser[]
}

export default async function AdminVendorsPage() {
  const vendors = await getVendors()

  return (
    <AdminLayout title="Vendor Management">
      <AdminVendorsClient initialVendors={vendors} />
    </AdminLayout>
  )
}
