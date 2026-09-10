'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Wallet,
  Smartphone,
  Landmark,
  Lock,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { cn, formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { normalizeGhanaPhone, formatGhanaPhone } from '@/lib/marketplace/phone'
import type { MomoNetwork, Payout, PayoutStatus, VendorPayoutDetails } from '@/types'

const NETWORKS: MomoNetwork[] = ['MTN MoMo', 'Telecel Cash', 'AT Money']

const STATUS: Record<PayoutStatus, { label: string; className: string }> = {
  held:            { label: 'In escrow',                 className: 'bg-teal-50 text-teal-700' },
  pending_release: { label: 'Being paid out',            className: 'bg-gold-50 text-gold-800' },
  released:        { label: 'Paid',                      className: 'bg-green-50 text-green-700' },
  failed:          { label: 'Failed, we’ll contact you', className: 'bg-red-50 text-red-700' },
  cancelled:       { label: 'Cancelled (refunded)',      className: 'bg-sand-100 text-sand-700' },
}

type PayoutRow = Payout & { order?: { reference?: string } | null }

/**
 * Where a vendor's 85% goes, plus their payout history. Before this page no
 * payout details were collected anywhere, so SWK Ghana had no way to pay a
 * vendor. The details are private: only the vendor and admins can read them.
 */
export default function VendorPayoutsPage() {
  const router = useRouter()
  const [loading, setLoading]         = useState(true)
  const [vendorId, setVendorId]       = useState<string | null>(null)
  const [saved, setSaved]             = useState<VendorPayoutDetails | null>(null)
  const [payouts, setPayouts]         = useState<PayoutRow[]>([])
  const [unavailable, setUnavailable] = useState(false)

  const [method, setMethod]               = useState<'momo' | 'bank'>('momo')
  const [network, setNetwork]             = useState<MomoNetwork>('MTN MoMo')
  const [bankName, setBankName]           = useState('')
  const [accountName, setAccountName]     = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/vendor/payouts')
        return
      }

      const { data: vendor } = await supabase
        .from('vendor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!vendor) {
        router.push('/vendor/apply')
        return
      }
      setVendorId(vendor.id)

      const [detailsRes, payoutsRes] = await Promise.all([
        supabase.from('vendor_payout_details').select('*').eq('vendor_id', vendor.id).maybeSingle(),
        supabase
          .from('payouts')
          .select('*, order:orders(reference)')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false }),
      ])

      if (detailsRes.error) {
        setUnavailable(true)
      } else if (detailsRes.data) {
        const d = detailsRes.data as VendorPayoutDetails
        setSaved(d)
        setMethod(d.method)
        if (d.momo_network) setNetwork(d.momo_network)
        setBankName(d.bank_name ?? '')
        setAccountName(d.account_name)
        setAccountNumber(d.method === 'momo' ? formatGhanaPhone(d.account_number) : d.account_number)
      }

      setPayouts((payoutsRes.data ?? []) as PayoutRow[])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!vendorId) return

    const name = accountName.trim()
    if (name.length < 2) {
      setError('Enter the name the account is registered in.')
      return
    }

    let number: string
    if (method === 'momo') {
      const normalized = normalizeGhanaPhone(accountNumber)
      if (!normalized) {
        setError('Enter the mobile money number, e.g. 024 123 4567.')
        return
      }
      number = `0${normalized.slice(4)}`
    } else {
      if (bankName.trim().length < 2) {
        setError('Enter the name of your bank.')
        return
      }
      number = accountNumber.replace(/\D/g, '')
      if (number.length < 9 || number.length > 20) {
        setError('Enter the full account number (9 to 20 digits).')
        return
      }
    }

    setError('')
    setSaving(true)
    const { data, error: saveError } = await createClient()
      .from('vendor_payout_details')
      .upsert(
        {
          vendor_id:      vendorId,
          method,
          momo_network:   method === 'momo' ? network : null,
          bank_name:      method === 'bank' ? bankName.trim() : null,
          account_name:   name,
          account_number: number,
        },
        { onConflict: 'vendor_id' },
      )
      .select()
      .single()
    setSaving(false)

    if (saveError) {
      setError('Could not save your details. Please try again.')
      return
    }
    setSaved(data as VendorPayoutDetails)
    toast.success('Payout details saved')
  }

  const paidOut  = payouts.filter(p => p.status === 'released').reduce((sum, p) => sum + p.net_amount, 0)
  const onTheWay = payouts
    .filter(p => p.status === 'held' || p.status === 'pending_release')
    .reduce((sum, p) => sum + p.net_amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50">
        <Navbar />
        <div role="status" className="flex items-center justify-center py-40">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading your payouts…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <main id="main" className="container-app py-8 max-w-3xl">
        <Link
          href="/vendor/dashboard"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-sand-600 hover:text-sand-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Dashboard
        </Link>
        <h1 className="text-2xl font-display font-bold text-sand-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-green-600" aria-hidden="true" /> Payouts
        </h1>
        <p className="text-sm text-sand-600 mt-1 mb-6 max-w-xl">
          When a buyer confirms delivery, SWK Ghana sends you 85% of the order to the account below.
        </p>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <p className="text-xs font-medium text-sand-600 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" /> Paid to you
            </p>
            <p className="text-2xl font-display font-bold text-sand-900 mt-1">{formatCurrency(paidOut)}</p>
          </div>
          <div className="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <p className="text-xs font-medium text-sand-600 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" /> On the way
            </p>
            <p className="text-2xl font-display font-bold text-sand-900 mt-1">{formatCurrency(onTheWay)}</p>
            <p className="text-xs text-sand-600 mt-0.5">Released as buyers confirm delivery</p>
          </div>
        </div>

        {/* Payout details */}
        <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card mb-6" aria-labelledby="payout-details-heading">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 id="payout-details-heading" className="text-base font-display font-semibold text-sand-900">
              Where we send your money
            </h2>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Saved {formatRelativeTime(saved.updated_at)}
              </span>
            )}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-sand-600 mb-5">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
            Private: only you and the SWK Ghana payouts team can see these details.
          </p>

          {unavailable ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gold-50 border border-gold-200 text-sm text-sand-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-gold-600" aria-hidden="true" />
              Payout details can&rsquo;t be saved just yet. Please email them to info@swkghana.org in the meantime.
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5" noValidate>
              <fieldset>
                <legend className="form-label">How would you like to be paid?</legend>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'momo', label: 'Mobile money', icon: Smartphone },
                    { value: 'bank', label: 'Bank account', icon: Landmark },
                  ] as const).map(option => {
                    const Icon = option.icon
                    const selected = method === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'relative flex items-center gap-2 min-h-[52px] px-4 rounded-xl border-2 cursor-pointer transition-colors',
                          selected ? 'border-green-600 bg-green-50' : 'border-sand-200 bg-white hover:border-green-300',
                        )}
                      >
                        <input
                          type="radio"
                          name="method"
                          value={option.value}
                          checked={selected}
                          onChange={() => setMethod(option.value)}
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-green-600 peer-focus-visible:ring-offset-2" aria-hidden="true" />
                        <Icon className={cn('w-5 h-5', selected ? 'text-green-700' : 'text-sand-600')} aria-hidden="true" />
                        <span className="text-sm font-semibold text-sand-900">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {method === 'momo' ? (
                <div>
                  <label htmlFor="momo-network" className="form-label">Network</label>
                  <select
                    id="momo-network"
                    value={network}
                    onChange={e => setNetwork(e.target.value as MomoNetwork)}
                    className="form-input"
                  >
                    {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="bank-name" className="form-label">Bank</label>
                  <input
                    id="bank-name"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. GCB Bank, Ecobank, Fidelity"
                    autoComplete="off"
                  />
                </div>
              )}

              <div>
                <label htmlFor="account-name" className="form-label">Name on the account</label>
                <input
                  id="account-name"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="form-input"
                  placeholder="As registered with the network or bank"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="account-number" className="form-label">
                  {method === 'momo' ? 'Mobile money number' : 'Account number'}
                </label>
                <input
                  id="account-number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="form-input"
                  inputMode={method === 'momo' ? 'tel' : 'numeric'}
                  placeholder={method === 'momo' ? '024 123 4567' : 'Your full account number'}
                  autoComplete="off"
                />
              </div>

              {error && <p role="alert" className="form-error">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 min-h-[44px] px-6 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {saved ? 'Update payout details' : 'Save payout details'}
              </button>
            </form>
          )}
        </section>

        {/* History */}
        <section className="bg-white rounded-xl border border-sand-200 shadow-card" aria-labelledby="payout-history-heading">
          <h2 id="payout-history-heading" className="px-6 py-4 border-b border-sand-100 text-base font-display font-semibold text-sand-900">
            Payout history
          </h2>
          {payouts.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-sand-600">
              No payouts yet. They appear here as soon as a buyer pays for one of your products.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {payouts.map(p => {
                const status = STATUS[p.status] ?? STATUS.held
                return (
                  <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sand-900 font-mono">{p.order?.reference ?? 'Order'}</p>
                      <p className="text-xs text-sand-600 mt-0.5">
                        {formatCurrency(p.gross_amount)} order · {formatCurrency(p.commission_amount)} fee ·{' '}
                        {p.released_at ? `paid ${formatDate(p.released_at)}` : formatRelativeTime(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-700">{formatCurrency(p.net_amount)}</p>
                      <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium', status.className)}>
                        {status.label}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
