'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FlaskConical,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShoppingBag,
  Smartphone,
} from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { useCartSync } from '@/lib/cart/useCartSync'
import { summarizeCart } from '@/lib/cart/summary'
import { CartNotices } from '@/components/cart/CartNotices'
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary'
import { CardFields } from '@/components/checkout/CardFields'
import { MomoFields } from '@/components/checkout/MomoFields'
import { CardBrandMark, MomoMark } from '@/components/checkout/PaymentMarks'
import { MomoPromptDialog, OtpDialog, ProcessingDialog } from '@/components/checkout/PaymentDialogs'
import {
  EMPTY_CARD,
  validateCardForm,
  validateMomoForm,
  type CardErrors,
  type CardFormValue,
  type MomoErrors,
  type MomoFormValue,
} from '@/lib/payments/forms'
import { formatExpiry, guessMomoNetwork, maskPhone, normalizeMomoNumber, paymentMethodLabel } from '@/lib/payments/methods'
import { formatGhanaPhone, normalizeGhanaPhone } from '@/lib/marketplace/phone'
import { cn, formatCurrency } from '@/lib/utils'
import { GHANA_REGIONS, type BuyerAddress, type GhanaRegion, type MomoNetwork, type PaymentMethod } from '@/types'

export interface CheckoutProfile {
  full_name: string
  email: string
  phone: string | null
}

interface CheckoutViewProps {
  profile: CheckoutProfile
  addresses: BuyerAddress[]
  paymentMethods: PaymentMethod[]
  /** Whether Paystack can take real payments here (for real products) */
  paymentsMode: 'live' | 'test' | 'off'
}

type PayChoice =
  | { kind: 'saved'; id: string }
  | { kind: 'card' }
  | { kind: 'momo' }
  | { kind: 'paystack'; channel: 'card' | 'mobile_money' }

type Phase = 'idle' | 'creating' | 'processing' | 'otp' | 'momo' | 'redirecting' | 'done'

type PayBody = Record<string, unknown> & { method: string }

interface PayResponse {
  ok: boolean
  status: number
  json: {
    status?: string
    error?: string
    code?: string
    message?: string
    retry?: boolean
    payment_url?: string
    checkout_id?: string
  }
}

const QUICK_LABELS = ['Home', 'Work', 'Other']
const MIN_PROCESSING_MS = 1500

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function postJson(url: string, body: unknown): Promise<PayResponse> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json }
  } catch {
    return { ok: false, status: 0, json: { error: 'You seem to be offline. Check your connection and try again. Nothing was charged.' } }
  }
}

function focusField(id: string) {
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (el) {
      el.focus()
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
}

export function CheckoutView({ profile, addresses, paymentMethods, paymentsMode }: CheckoutViewProps) {
  const router = useRouter()
  const { items, ready, removeItems } = useCart()
  const { notices, dismissNotices, sync, syncing } = useCartSync()
  const summary = useMemo(() => summarizeCart(items), [items])
  const isSample = summary.kind === 'sample'
  const isLive = summary.kind === 'live'

  // ── Delivery ──────────────────────────────────────────────────────────────
  const defaultAddress = addresses.find(a => a.is_default) ?? addresses[0]
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? 'new')
  const profilePhone = normalizeGhanaPhone(profile.phone)
  const [newAddress, setNewAddress] = useState({
    label: addresses.length === 0 ? 'Home' : '',
    phone: profilePhone ? formatGhanaPhone(profilePhone) : '',
    region: '' as GhanaRegion | '',
    address: '',
  })
  const [saveAddress, setSaveAddress] = useState(true)
  const [notes, setNotes] = useState('')
  const [addressErrors, setAddressErrors] = useState<Partial<Record<'phone' | 'region' | 'address', string>>>({})

  // ── Payment ───────────────────────────────────────────────────────────────
  const savedMethods = useMemo(
    () => (isSample ? paymentMethods.filter(m => m.provider === 'demo') : []),
    [isSample, paymentMethods],
  )
  const [choice, setChoice] = useState<PayChoice>({ kind: 'card' })
  const choiceTouched = useRef(false)

  // Pick a sensible default once we know what's in the cart
  useEffect(() => {
    if (choiceTouched.current || !ready) return
    if (isLive) {
      setChoice({ kind: 'paystack', channel: 'mobile_money' })
    } else {
      const preferred = savedMethods.find(m => m.is_default) ?? savedMethods[0]
      setChoice(preferred ? { kind: 'saved', id: preferred.id } : { kind: 'card' })
    }
  }, [ready, isLive, savedMethods])

  const chooseMethod = (next: PayChoice) => {
    choiceTouched.current = true
    setChoice(next)
    setPaymentError(null)
  }

  const momoPhoneDefault = normalizeMomoNumber(profile.phone)
  const [card, setCard] = useState<CardFormValue>({ ...EMPTY_CARD, name: profile.full_name })
  const [cardErrors, setCardErrors] = useState<CardErrors>({})
  const [momo, setMomo] = useState<MomoFormValue>({
    network: guessMomoNetwork(momoPhoneDefault) ?? '',
    phone: momoPhoneDefault ? formatGhanaPhone(momoPhoneDefault) : '',
  })
  const [momoErrors, setMomoErrors] = useState<MomoErrors>({})
  const [savePayment, setSavePayment] = useState(true)

  // ── Flow ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle')
  const [processingChannel, setProcessingChannel] = useState<'card' | 'momo'>('card')
  const [error, setError] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [otp, setOtp] = useState<{ message: string; error: string | null; busy: boolean }>({ message: '', error: null, busy: false })
  const [momoPrompt, setMomoPrompt] = useState<{ network: MomoNetwork | string; phone: string } | null>(null)
  const checkoutRef = useRef<{ id: string; signature: string; total: number; productIds: string[] } | null>(null)
  const pendingBody = useRef<PayBody | null>(null)

  const busy = phase !== 'idle'

  // ── Building the requests ─────────────────────────────────────────────────

  function buildDelivery(): Record<string, unknown> | null {
    if (addressId !== 'new' && addresses.some(a => a.id === addressId)) {
      setAddressErrors({})
      return { address_id: addressId }
    }
    const errors: typeof addressErrors = {}
    const phone = normalizeGhanaPhone(newAddress.phone)
    if (!phone) errors.phone = 'Enter a Ghana phone number the shop can call, e.g. 024 123 4567'
    if (!newAddress.region) errors.region = 'Choose your region'
    if (newAddress.address.trim().length < 5) errors.address = 'Enter a fuller address: house number, street or landmark, area'
    setAddressErrors(errors)
    const first = (['phone', 'region', 'address'] as const).find(k => errors[k])
    if (first) {
      focusField(`addr-${first}`)
      return null
    }
    return {
      phone,
      region: newAddress.region,
      address: newAddress.address.trim(),
      label: newAddress.label.trim() || undefined,
      save: saveAddress,
    }
  }

  function buildPayment():
    | { body: PayBody; channel: 'card' | 'momo' | 'paystack'; momo?: { network: string; phone: string } }
    | null {
    setPaymentError(null)
    if (choice.kind === 'paystack') {
      return { body: { method: 'paystack', channel: choice.channel }, channel: 'paystack' }
    }
    if (choice.kind === 'saved') {
      const method = savedMethods.find(m => m.id === choice.id)
      if (!method) {
        setPaymentError('Choose a payment method.')
        return null
      }
      const body: PayBody = { method: 'saved', payment_method_id: method.id }
      return method.kind === 'momo'
        ? { body, channel: 'momo', momo: { network: method.momo_network ?? 'Mobile money', phone: method.momo_phone ?? '' } }
        : { body, channel: 'card' }
    }
    if (choice.kind === 'card') {
      const { errors, payload } = validateCardForm(card)
      setCardErrors(errors)
      if (!payload) {
        const first = (['number', 'expiry', 'cvc', 'name'] as const).find(k => errors[k])
        if (first) focusField(`card-${first}`)
        return null
      }
      return { body: { method: 'card', ...payload, save: savePayment }, channel: 'card' }
    }
    const { errors, payload } = validateMomoForm(momo)
    setMomoErrors(errors)
    if (!payload) {
      if (errors.phone) focusField('momo-phone')
      return null
    }
    return {
      body: { method: 'momo', network: payload.network, phone: payload.phone, save: savePayment },
      channel: 'momo',
      momo: { network: payload.network, phone: payload.phone },
    }
  }

  async function ensureCheckout(delivery: Record<string, unknown>) {
    const lines = summary.lines.map(l => ({ product_id: l.product_id, quantity: l.quantity }))
    const signature = JSON.stringify({ lines, delivery, notes: notes.trim(), total: summary.total })
    if (checkoutRef.current?.signature === signature) return checkoutRef.current

    const res = await postJson('/api/checkout', {
      items: lines,
      delivery,
      notes: notes.trim() || undefined,
      expected_total: summary.total,
      replaces: checkoutRef.current?.id,
    })

    if (res.status === 401) {
      router.push('/login?redirect=/checkout')
      return null
    }
    if (!res.ok) {
      if (res.json.code === 'cart_changed' || res.json.code === 'price_changed') sync()
      setError(res.json.error ?? 'We couldn’t start your checkout. Please try again.')
      return null
    }
    const checkout = (res.json as unknown as { checkout: { id: string; total_amount: number } }).checkout
    checkoutRef.current = {
      id: checkout.id,
      signature,
      total: Number(checkout.total_amount),
      productIds: lines.map(l => l.product_id),
    }
    return checkoutRef.current
  }

  // ── Paying ────────────────────────────────────────────────────────────────

  const finishPaid = useCallback((checkoutId: string) => {
    setPhase('done')
    removeItems(checkoutRef.current?.productIds ?? [])
    router.replace(`/checkout/success/${checkoutId}`)
  }, [removeItems, router])

  const handleResult = useCallback((res: PayResponse, checkoutId: string) => {
    const status = res.json.status
    if (status === 'paid') {
      finishPaid(checkoutId)
      return
    }
    if (status === 'otp_required') {
      setOtp({ message: res.json.message ?? 'Enter the code your bank sent to your phone.', error: res.json.retry ? (res.json.message ?? null) : null, busy: false })
      setPhase('otp')
      return
    }
    if (status === 'redirect' && res.json.payment_url) {
      setPhase('redirecting')
      window.location.href = res.json.payment_url
      return
    }
    if (res.status === 401) {
      router.push('/login?redirect=/checkout')
      return
    }
    setPhase('idle')
    if (res.status === 402) {
      setPaymentError(res.json.error ?? 'The payment was declined. Nothing was charged.')
      focusField('payment-heading')
      return
    }
    if (res.json.code === 'checkout_closed') checkoutRef.current = null
    if (res.json.code === 'cart_changed') sync()
    setError(res.json.error ?? 'Something went wrong. Nothing was charged; please try again.')
  }, [finishPaid, router, sync])

  async function runPayment(body: PayBody, channel: 'card' | 'momo') {
    const checkout = checkoutRef.current
    if (!checkout) return
    setProcessingChannel(channel)
    setPhase('processing')
    const [res] = await Promise.all([postJson(`/api/checkout/${checkout.id}/pay`, body), wait(MIN_PROCESSING_MS)])
    handleResult(res, checkout.id)
  }

  async function handlePay(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy) return
    setError(null)

    const delivery = buildDelivery()
    if (!delivery) return
    const payment = buildPayment()
    if (!payment) return

    setPhase('creating')
    const checkout = await ensureCheckout(delivery)
    if (!checkout) {
      setPhase('idle')
      return
    }

    pendingBody.current = payment.body
    if (payment.channel === 'momo' && payment.momo) {
      setMomoPrompt(payment.momo)
      setPhase('momo')
      return
    }
    if (payment.channel === 'paystack') {
      setPhase('redirecting')
      const res = await postJson(`/api/checkout/${checkout.id}/pay`, payment.body)
      handleResult(res, checkout.id)
      return
    }
    await runPayment(payment.body, 'card')
  }

  async function submitOtp(code: string) {
    const checkout = checkoutRef.current
    if (!checkout || !pendingBody.current) return
    setOtp(o => ({ ...o, busy: true, error: null }))
    const res = await postJson(`/api/checkout/${checkout.id}/pay`, { ...pendingBody.current, otp: code })
    if (res.json.status === 'otp_required') {
      setOtp({ message: otp.message, error: res.json.message ?? 'That code didn’t match.', busy: false })
      return
    }
    setOtp(o => ({ ...o, busy: false }))
    handleResult(res, checkout.id)
  }

  function approveMomo() {
    if (!pendingBody.current) return
    setMomoPrompt(null)
    runPayment({ ...pendingBody.current, approved: true }, 'momo')
  }

  // Stable, because the prompt's timeout effect calls it
  const declineMomo = useCallback((reason?: string) => {
    setMomoPrompt(null)
    setPhase('idle')
    setPaymentError(reason ?? 'You declined the payment on your phone. Nothing was charged.')
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto text-center py-20" role="status">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3 animate-pop-in" aria-hidden="true" />
        <p className="text-lg font-display font-bold text-sand-900">Payment successful</p>
        <p className="text-sm text-sand-600 mt-1">Opening your order confirmation…</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="grid lg:grid-cols-[1fr_380px] gap-8" role="status" aria-label="Loading checkout">
        <div className="space-y-5">{[0, 1, 2].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    )
  }

  if (summary.lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-sand-200 shadow-card px-6 py-14 text-center">
        <ShoppingBag className="w-10 h-10 text-green-600 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-xl font-display font-bold text-sand-900">Your cart is empty</h2>
        <p className="text-sm text-sand-600 mt-1 mb-6">
          {items.length > 0 ? 'The items in your cart are no longer available.' : 'Add something to your cart to check out.'}
        </p>
        <Link href={items.length > 0 ? '/cart' : '/marketplace'} className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
          {items.length > 0 ? 'Review cart' : 'Start shopping'}
        </Link>
      </div>
    )
  }

  if (summary.kind === 'mixed') {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-sand-200 shadow-card px-6 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-gold-600 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-xl font-display font-bold text-sand-900">Sample and real products are paid separately</h2>
        <p className="text-sm text-sand-600 mt-2 mb-6">
          Sample products use a test payment, so they can’t share a checkout with real ones.
        </p>
        <Link href="/cart" className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
          Sort my cart
        </Link>
      </div>
    )
  }

  const paymentsUnavailable = isLive && paymentsMode === 'off'
  const payLabel =
    phase === 'creating' ? 'Preparing your order…'
      : phase === 'redirecting' ? 'Opening secure payment…'
        : phase === 'idle' ? `Pay ${formatCurrency(summary.total)}`
          : 'Processing…'

  return (
    <>
      {/* Mobile: the summary folds away above the form */}
      <details className="lg:hidden mb-5 bg-white rounded-2xl border border-sand-200 shadow-card group">
        <summary className="flex items-center justify-between gap-3 px-4 min-h-[56px] cursor-pointer list-none">
          <span className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="group-open:hidden">Show order summary</span>
            <span className="hidden group-open:inline">Hide order summary</span>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
          <span className="text-base font-bold text-sand-900 tabular-nums">{formatCurrency(summary.total)}</span>
        </summary>
        <div className="px-4 pb-4 border-t border-sand-100 pt-4">
          <CheckoutSummary summary={summary} />
        </div>
      </details>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
        <form onSubmit={handlePay} noValidate className="space-y-5" aria-describedby={error ? 'checkout-error' : undefined}>
          <CartNotices notices={notices} onDismiss={dismissNotices} />

          {/* ── 1. Delivery ─────────────────────────────────────────── */}
          <section aria-labelledby="delivery-heading" className="bg-white rounded-2xl border border-sand-200 shadow-card p-5 sm:p-6">
            <h2 id="delivery-heading" className="flex items-center gap-2.5 text-lg font-display font-bold text-sand-900">
              <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm flex items-center justify-center" aria-hidden="true">1</span>
              Delivery details
            </h2>
            <p className="text-sm text-sand-600 mt-1 mb-4">
              Signed in as <strong className="text-sand-800">{profile.full_name}</strong> ({profile.email}). Your receipt goes to this email.
            </p>

            {addresses.length > 0 && (
              <fieldset className="space-y-2 mb-4">
                <legend className="sr-only">Choose a delivery address</legend>
                {addresses.map(a => (
                  <label
                    key={a.id}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-colors',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 has-[:focus-visible]:ring-offset-2',
                      addressId === a.id ? 'border-green-600 bg-green-50/60' : 'border-sand-200 hover:border-sand-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={a.id}
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                      className="mt-1 accent-green-600 w-4 h-4"
                    />
                    <span className="flex-1 min-w-0 text-sm">
                      <span className="flex items-center gap-2 font-semibold text-sand-900">
                        <MapPin className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                        {a.label || 'Address'}
                        {a.is_default && <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-px">Default</span>}
                      </span>
                      <span className="block text-sand-700 mt-0.5">{a.address}, {a.region}</span>
                      <span className="block text-xs text-sand-600 mt-0.5">{formatGhanaPhone(a.phone)}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-colors',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 has-[:focus-visible]:ring-offset-2',
                    addressId === 'new' ? 'border-green-600 bg-green-50/60' : 'border-dashed border-sand-300 hover:border-sand-400',
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    value="new"
                    checked={addressId === 'new'}
                    onChange={() => setAddressId('new')}
                    className="accent-green-600 w-4 h-4"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-sand-800">
                    <Plus className="w-4 h-4" aria-hidden="true" /> Deliver somewhere else
                  </span>
                </label>
              </fieldset>
            )}

            {addressId === 'new' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="addr-phone" className="form-label">Phone for delivery <span className="text-red-600" aria-hidden="true">*</span></label>
                    <input
                      id="addr-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="024 123 4567"
                      value={newAddress.phone}
                      onChange={e => setNewAddress(a => ({ ...a, phone: e.target.value }))}
                      aria-invalid={!!addressErrors.phone || undefined}
                      aria-describedby={addressErrors.phone ? 'addr-phone-error' : 'addr-phone-hint'}
                      required
                      className={cn('form-input', addressErrors.phone && 'border-red-400')}
                    />
                    {addressErrors.phone
                      ? <p id="addr-phone-error" className="form-error">{addressErrors.phone}</p>
                      : <p id="addr-phone-hint" className="mt-1 text-[11px] text-sand-600">The shop calls this number to arrange delivery.</p>}
                  </div>
                  <div>
                    <label htmlFor="addr-region" className="form-label">Region <span className="text-red-600" aria-hidden="true">*</span></label>
                    <select
                      id="addr-region"
                      value={newAddress.region}
                      onChange={e => setNewAddress(a => ({ ...a, region: e.target.value as GhanaRegion }))}
                      aria-invalid={!!addressErrors.region || undefined}
                      aria-describedby={addressErrors.region ? 'addr-region-error' : undefined}
                      required
                      className={cn('form-input', addressErrors.region && 'border-red-400')}
                    >
                      <option value="">Select your region…</option>
                      {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {addressErrors.region && <p id="addr-region-error" className="form-error">{addressErrors.region}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="addr-address" className="form-label">Delivery address <span className="text-red-600" aria-hidden="true">*</span></label>
                  <textarea
                    id="addr-address"
                    autoComplete="street-address"
                    rows={3}
                    maxLength={300}
                    placeholder="House number and street, area, nearest landmark or GhanaPost GPS (e.g. GA-123-4567)"
                    value={newAddress.address}
                    onChange={e => setNewAddress(a => ({ ...a, address: e.target.value }))}
                    aria-invalid={!!addressErrors.address || undefined}
                    aria-describedby={addressErrors.address ? 'addr-address-error' : undefined}
                    required
                    className={cn('form-input resize-none', addressErrors.address && 'border-red-400')}
                  />
                  {addressErrors.address && <p id="addr-address-error" className="form-error">{addressErrors.address}</p>}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <label className="flex items-center gap-2 text-sm text-sand-700 cursor-pointer">
                    <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="w-4 h-4 accent-green-600" />
                    Save this address for next time
                  </label>
                  {saveAddress && (
                    <fieldset className="flex items-center gap-1.5">
                      <legend className="sr-only">Name this address</legend>
                      {QUICK_LABELS.map(label => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={newAddress.label === label}
                          onClick={() => setNewAddress(a => ({ ...a, label }))}
                          className={cn(
                            'min-h-[32px] px-3 rounded-full border text-xs font-medium transition-colors',
                            newAddress.label === label ? 'border-green-600 bg-green-50 text-green-800' : 'border-sand-200 text-sand-700 hover:border-sand-300',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </fieldset>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="notes" className="form-label">
                Delivery notes <span className="font-normal text-sand-600">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={2}
                maxLength={500}
                placeholder="Gate colour, best time to call, anything the shop should know"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-input resize-none"
              />
            </div>
          </section>

          {/* ── 2. Payment ──────────────────────────────────────────── */}
          <section aria-labelledby="payment-heading" className="bg-white rounded-2xl border border-sand-200 shadow-card p-5 sm:p-6">
            <h2 id="payment-heading" tabIndex={-1} className="flex items-center gap-2.5 text-lg font-display font-bold text-sand-900 outline-none">
              <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm flex items-center justify-center" aria-hidden="true">2</span>
              Payment
            </h2>

            {isSample && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-900">
                <FlaskConical className="w-5 h-5 flex-shrink-0 text-gold-600" aria-hidden="true" />
                <p>
                  <strong>Test payment.</strong> These are sample products, so you pay with a test card or a
                  simulated mobile money prompt. No real money is taken, and real cards are refused.
                </p>
              </div>
            )}

            {paymentError && (
              <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <p>{paymentError}</p>
              </div>
            )}

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Choose how to pay</legend>

              {savedMethods.map(m => (
                <PaymentOption
                  key={m.id}
                  checked={choice.kind === 'saved' && choice.id === m.id}
                  onSelect={() => chooseMethod({ kind: 'saved', id: m.id })}
                  icon={m.kind === 'card' ? <CardBrandMark brand={m.brand} /> : <MomoMark network={m.momo_network} />}
                  title={paymentMethodLabel(m)}
                  detail={m.kind === 'card' ? `Expires ${formatExpiry(m.exp_month, m.exp_year)}` : `Mobile money · ${maskPhone(m.momo_phone)}`}
                  badge={m.is_default ? 'Default' : 'Saved'}
                />
              ))}

              {isSample ? (
                <>
                  <PaymentOption
                    checked={choice.kind === 'card'}
                    onSelect={() => chooseMethod({ kind: 'card' })}
                    icon={<span className="w-11 h-7 rounded-md border border-sand-200 bg-sand-50 flex items-center justify-center"><CreditCard className="w-4 h-4 text-sand-700" /></span>}
                    title={savedMethods.length ? 'Use another card' : 'Debit or credit card'}
                    detail="Visa, Mastercard"
                  >
                    {choice.kind === 'card' && (
                      <div className="mt-4 pt-4 border-t border-sand-100">
                        <CardFields value={card} onChange={setCard} errors={cardErrors} idPrefix="card" defaultName={profile.full_name} />
                      </div>
                    )}
                  </PaymentOption>
                  <PaymentOption
                    checked={choice.kind === 'momo'}
                    onSelect={() => chooseMethod({ kind: 'momo' })}
                    icon={<span className="w-11 h-7 rounded-md border border-sand-200 bg-sand-50 flex items-center justify-center"><Smartphone className="w-4 h-4 text-sand-700" /></span>}
                    title={savedMethods.some(m => m.kind === 'momo') ? 'Use another mobile money number' : 'Mobile money'}
                    detail="MTN MoMo, Telecel Cash, AT Money"
                  >
                    {choice.kind === 'momo' && (
                      <div className="mt-4 pt-4 border-t border-sand-100">
                        <MomoFields value={momo} onChange={setMomo} errors={momoErrors} idPrefix="momo" />
                      </div>
                    )}
                  </PaymentOption>

                  {(choice.kind === 'card' || choice.kind === 'momo') && (
                    <label className="flex items-center gap-2 pt-2 text-sm text-sand-700 cursor-pointer">
                      <input type="checkbox" checked={savePayment} onChange={e => setSavePayment(e.target.checked)} className="w-4 h-4 accent-green-600" />
                      {choice.kind === 'card' ? 'Save this card for faster checkout' : 'Save this number for faster checkout'}
                    </label>
                  )}
                </>
              ) : (
                <>
                  <PaymentOption
                    checked={choice.kind === 'paystack' && choice.channel === 'mobile_money'}
                    onSelect={() => chooseMethod({ kind: 'paystack', channel: 'mobile_money' })}
                    icon={<span className="w-11 h-7 rounded-md border border-sand-200 bg-sand-50 flex items-center justify-center"><Smartphone className="w-4 h-4 text-sand-700" /></span>}
                    title="Mobile money"
                    detail="MTN MoMo, Telecel Cash, AT Money, through Paystack"
                  />
                  <PaymentOption
                    checked={choice.kind === 'paystack' && choice.channel === 'card'}
                    onSelect={() => chooseMethod({ kind: 'paystack', channel: 'card' })}
                    icon={<span className="w-11 h-7 rounded-md border border-sand-200 bg-sand-50 flex items-center justify-center"><CreditCard className="w-4 h-4 text-sand-700" /></span>}
                    title="Debit or credit card"
                    detail="Visa, Mastercard, through Paystack"
                  />
                  <p className="text-xs text-sand-600 pt-1">
                    You’ll finish paying on Paystack’s secure page, then come straight back here.
                  </p>
                </>
              )}
            </fieldset>
          </section>

          {/* ── 3. Review and pay ───────────────────────────────────── */}
          <section aria-labelledby="review-heading" className="bg-white rounded-2xl border border-sand-200 shadow-card p-5 sm:p-6">
            <h2 id="review-heading" className="flex items-center gap-2.5 text-lg font-display font-bold text-sand-900">
              <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm flex items-center justify-center" aria-hidden="true">3</span>
              Review and pay
            </h2>
            <p className="text-sm text-sand-600 mt-1 mb-4">
              {summary.item_count} {summary.item_count === 1 ? 'item' : 'items'} from {summary.shops.length}{' '}
              {summary.shops.length === 1 ? 'shop' : 'shops'}. Each shop delivers its own items and calls you first.
            </p>

            {error && (
              <div id="checkout-error" role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            {paymentsUnavailable && (
              <div role="status" className="mb-4 flex items-start gap-2.5 rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-sand-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <p>Online payment for these products isn’t switched on yet. Please check back soon.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || paymentsUnavailable || syncing}
              className="hidden lg:inline-flex w-full items-center justify-center gap-2 min-h-[56px] rounded-xl bg-green-600 text-white text-base font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
              {payLabel}
            </button>
            <p className="mt-3 text-xs text-sand-600 leading-relaxed">
              By paying you agree to the <Link href="/terms" className="underline underline-offset-2 hover:text-sand-900">Terms</Link>.
              SWK Ghana holds your payment in escrow and releases it to each shop only when you confirm delivery.
              If something goes wrong you can report a problem from your order page.
            </p>
          </section>

          <Link href="/cart" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to cart
          </Link>

          {/* Mobile: the pay button stays in reach */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-card-lg">
            <button
              type="submit"
              disabled={busy || paymentsUnavailable || syncing}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-green-600 text-white text-base font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-60 transition-colors"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
              {payLabel}
            </button>
          </div>
        </form>

        <aside aria-labelledby="summary-heading" className="hidden lg:block lg:sticky lg:top-24 bg-white rounded-2xl border border-sand-200 shadow-card p-5">
          <h2 id="summary-heading" className="text-base font-display font-bold text-sand-900 mb-4">Order summary</h2>
          <CheckoutSummary summary={summary} />
        </aside>
      </div>

      <ProcessingDialog open={phase === 'processing'} channel={processingChannel} />
      <OtpDialog
        open={phase === 'otp'}
        message={otp.message}
        error={otp.error}
        busy={otp.busy}
        onSubmit={submitOtp}
        onCancel={() => { setPhase('idle'); setPaymentError('Payment cancelled. Nothing was charged.') }}
      />
      <MomoPromptDialog
        open={phase === 'momo' && !!momoPrompt}
        network={momoPrompt?.network ?? ''}
        phone={momoPrompt?.phone ?? ''}
        amount={checkoutRef.current?.total ?? summary.total}
        busy={false}
        onApprove={approveMomo}
        onDecline={declineMomo}
      />
    </>
  )
}

function PaymentOption({
  checked,
  onSelect,
  icon,
  title,
  detail,
  badge,
  children,
}: {
  checked: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  detail?: string
  badge?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 transition-colors',
        checked ? 'border-green-600 bg-green-50/40' : 'border-sand-200 hover:border-sand-300',
      )}
    >
      <label className="flex items-center gap-3 p-3.5 cursor-pointer rounded-xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 has-[:focus-visible]:ring-offset-2">
        <input type="radio" name="payment" checked={checked} onChange={onSelect} className="w-4 h-4 accent-green-600 flex-shrink-0" />
        {icon}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold text-sand-900">
            {title}
            {badge && <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-px">{badge}</span>}
          </span>
          {detail && <span className="block text-xs text-sand-600 truncate">{detail}</span>}
        </span>
      </label>
      {children && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  )
}
