import { createAdminClient } from '@/lib/supabase/server'

export interface SampleDataStatus {
  /** Whether the sample shops show on the storefront */
  visible: boolean
  products: number
  orders: number
  /** Sample orders still moving (paid through delivered, or disputed) */
  open_orders: number
}

export async function loadSampleDataStatus(): Promise<SampleDataStatus> {
  const admin = await createAdminClient()
  const [visible, products, orders, open] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }).eq('is_demo', true).eq('status', 'approved'),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('is_demo', true),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('is_demo', true),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('is_demo', true)
      .in('status', ['paid', 'confirmed', 'dispatched', 'delivered', 'disputed']),
  ])
  return {
    visible: (visible.count ?? 0) > 0,
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    open_orders: open.count ?? 0,
  }
}
