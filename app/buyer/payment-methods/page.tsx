import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { PaymentMethodsManager } from '@/components/buyer/PaymentMethodsManager'
import type { PaymentMethod } from '@/types'

export const metadata: Metadata = { title: 'Payment methods' }
export const dynamic = 'force-dynamic'

export default async function PaymentMethodsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/buyer/payment-methods')

  const [{ data: methods }, { data: profile }] = await Promise.all([
    supabase
      .from('payment_methods')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('users').select('full_name').eq('id', user.id).maybeSingle(),
  ])

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />
      <main id="main" className="container-app max-w-3xl py-8 pb-28 md:pb-12">
        <Link
          href="/buyer/orders"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-sand-600 hover:text-sand-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> My orders
        </Link>
        <h1 className="text-2xl font-display font-bold text-sand-900 mb-1">Payment methods</h1>
        <p className="text-sm text-sand-600 mb-6">Cards and mobile money you’ve saved for faster checkout.</p>
        <PaymentMethodsManager
          initialMethods={(methods ?? []) as PaymentMethod[]}
          defaultName={profile?.full_name ?? ''}
        />
      </main>
      <MobileBottomNav />
    </div>
  )
}
