import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminPayoutsClient } from '@/components/admin/AdminPayoutsClient'
import { createClient } from '@/lib/supabase/server'
import { loadAdminPayouts, type AdminPayout } from '@/lib/admin/payouts'

export const metadata = { title: 'Payout Management' }
export const dynamic = 'force-dynamic'

export default async function AdminPayoutsPage() {
  let payouts: AdminPayout[] = []
  try {
    payouts = await loadAdminPayouts(await createClient())
  } catch (err) {
    console.error('[Admin payouts] load failed:', err)
  }

  return (
    <AdminLayout title="Payout Management">
      <AdminPayoutsClient initialPayouts={payouts} />
    </AdminLayout>
  )
}
