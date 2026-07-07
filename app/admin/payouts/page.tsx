import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPayoutsClient } from '@/components/admin/AdminPayoutsClient'
import { createClient } from '@/lib/supabase/server'
import type { Payout } from '@/types'

export const metadata = { title: 'Payout Management' }
export const dynamic = 'force-dynamic'

async function getPayouts(): Promise<Payout[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('payouts')
    .select(`
      *,
      order:orders(id, reference, status),
      vendor:vendor_profiles(id, business_name, user:users(email, full_name))
    `)
    .order('created_at', { ascending: false })
  return (data ?? []) as Payout[]
}

export default async function AdminPayoutsPage() {
  const payouts = await getPayouts()

  return (
    <AdminLayout title="Payout Management">
      <AdminPayoutsClient initialPayouts={payouts} />
    </AdminLayout>
  )
}
