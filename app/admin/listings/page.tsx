import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminListingsClient } from '@/components/admin/AdminListingsClient'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types'

export const metadata = { title: 'Listing Management' }
export const dynamic = 'force-dynamic'

type ProductWithVendor = Product & { vendor: { business_name: string } | null }

async function getProducts(): Promise<ProductWithVendor[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, vendor:vendor_profiles(business_name)')
    .order('created_at', { ascending: false })
  return (data ?? []) as ProductWithVendor[]
}

export default async function AdminListingsPage() {
  const products = await getProducts()

  return (
    <AdminLayout title="Listing Management">
      <AdminListingsClient initialProducts={products} />
    </AdminLayout>
  )
}
