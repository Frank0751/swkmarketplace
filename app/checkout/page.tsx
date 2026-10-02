import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { paymentsMode } from '@/lib/paystack/client'
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader'
import { CheckoutView } from '@/components/checkout/CheckoutView'
import type { BuyerAddress, PaymentMethod } from '@/types'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/checkout')

  // RLS returns only this buyer's own addresses and payment methods
  const [{ data: profile }, { data: addresses }, { data: methods }] = await Promise.all([
    supabase.from('users').select('full_name, email, phone').eq('id', user.id).maybeSingle(),
    supabase
      .from('buyer_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('payment_methods')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-sand-50">
      <CheckoutHeader />
      <main id="main" className="container-app max-w-6xl py-6 md:py-10 pb-32 lg:pb-12">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-sand-900 mb-6">Checkout</h1>
        <CheckoutView
          profile={{
            full_name: profile?.full_name || user.email?.split('@')[0] || 'there',
            email: profile?.email || user.email || '',
            phone: profile?.phone ?? null,
          }}
          addresses={(addresses ?? []) as BuyerAddress[]}
          paymentMethods={(methods ?? []) as PaymentMethod[]}
          paymentsMode={paymentsMode()}
        />
      </main>
    </div>
  )
}
