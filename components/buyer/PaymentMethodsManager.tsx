'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Smartphone, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CardFields } from '@/components/checkout/CardFields'
import { MomoFields } from '@/components/checkout/MomoFields'
import { CardBrandMark, MomoMark } from '@/components/checkout/PaymentMarks'
import {
  EMPTY_CARD,
  validateCardForm,
  validateMomoForm,
  type CardErrors,
  type CardFormValue,
  type MomoErrors,
  type MomoFormValue,
} from '@/lib/payments/forms'
import { formatExpiry, maskPhone, paymentMethodLabel } from '@/lib/payments/methods'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types'

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

const CARD_STYLE: Record<string, string> = {
  visa:       'from-[#1a1f71] to-[#2b4bb3]',
  mastercard: 'from-sand-900 to-sand-700',
  verve:      'from-[#00425f] to-[#0a6b8f]',
}
const MOMO_STYLE: Record<string, string> = {
  'MTN MoMo':     'from-[#ffcc00] to-[#f2b705] text-sand-900',
  'Telecel Cash': 'from-[#e40000] to-[#b30000]',
  'AT Money':     'from-[#0047ba] to-[#00338a]',
}

export function PaymentMethodsManager({ initialMethods, defaultName }: { initialMethods: PaymentMethod[]; defaultName: string }) {
  const router = useRouter()
  const [methods, setMethods] = useState(initialMethods)
  const [adding, setAdding] = useState<'card' | 'momo' | null>(null)
  const [removing, setRemoving] = useState<PaymentMethod | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [card, setCard] = useState<CardFormValue>({ ...EMPTY_CARD, name: defaultName })
  const [cardErrors, setCardErrors] = useState<CardErrors>({})
  const [momo, setMomo] = useState<MomoFormValue>({ network: '', phone: '' })
  const [momoErrors, setMomoErrors] = useState<MomoErrors>({})
  const [makeDefault, setMakeDefault] = useState(false)
  const [otp, setOtp] = useState<{ needed: boolean; message: string; code: string; error: string | null }>({ needed: false, message: '', code: '', error: null })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openAdd(kind: 'card' | 'momo') {
    setAdding(kind)
    setCard({ ...EMPTY_CARD, name: defaultName })
    setCardErrors({})
    setMomo({ network: '', phone: '' })
    setMomoErrors({})
    setMakeDefault(methods.length === 0)
    setOtp({ needed: false, message: '', code: '', error: null })
    setFormError(null)
  }

  async function refresh(updated?: PaymentMethod[]) {
    if (updated) setMethods(updated)
    router.refresh()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    let body: Record<string, unknown>
    if (adding === 'card') {
      const { errors, payload } = validateCardForm(card)
      setCardErrors(errors)
      if (!payload) return
      body = { kind: 'card', ...payload, make_default: makeDefault, otp: otp.needed ? otp.code : undefined }
    } else {
      const { errors, payload } = validateMomoForm(momo)
      setMomoErrors(errors)
      if (!payload) return
      body = { kind: 'momo', ...payload, make_default: makeDefault }
    }

    setSaving(true)
    const res = await send('/api/payment-methods', 'POST', body)
    setSaving(false)

    if (res.json.status === 'otp_required') {
      setOtp(o => ({ ...o, needed: true, message: res.json.message, error: res.json.retry ? res.json.message : null }))
      return
    }
    if (!res.ok) {
      setFormError(res.json.error ?? 'Could not save this payment method.')
      return
    }
    const saved = res.json.method as PaymentMethod
    const next = [saved, ...methods.filter(m => m.id !== saved.id)]
      .map(m => (saved.is_default && m.id !== saved.id ? { ...m, is_default: false } : m))
    toast.success(adding === 'card' ? 'Card saved' : 'Mobile money number saved')
    setAdding(null)
    refresh(next)
  }

  async function makeDefaultMethod(m: PaymentMethod) {
    setBusyId(m.id)
    const res = await send(`/api/payment-methods/${m.id}`, 'PATCH', { is_default: true })
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.json.error ?? 'Could not update')
      return
    }
    toast.success(`${paymentMethodLabel(m)} is now your default`)
    refresh(methods.map(x => ({ ...x, is_default: x.id === m.id })))
  }

  async function remove(m: PaymentMethod) {
    const res = await send(`/api/payment-methods/${m.id}`, 'DELETE')
    if (!res.ok) {
      toast.error(res.json.error ?? 'Could not remove')
      return
    }
    toast.success('Payment method removed')
    let rest = methods.filter(x => x.id !== m.id)
    // The server makes the newest remaining method the default; mirror it
    if (m.is_default && rest.length > 0 && !rest.some(x => x.is_default)) {
      const newest = [...rest].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      rest = rest.map(x => ({ ...x, is_default: x.id === newest.id }))
    }
    refresh(rest)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gold-200 border-l-4 border-l-gold-400 bg-gold-50 px-4 py-3 text-sm text-gold-900">
        <p>
          Payments are in test mode while our first vendors join, so only test cards can be saved here and they
          pay for sample orders. When live payments start, cards are kept securely by our payment provider.
        </p>
      </div>

      {methods.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sand-200 shadow-card px-6 py-12 text-center">
          <p className="eyebrow mb-3">Nothing saved yet</p>
          <p className="text-lg font-bold text-sand-900">No saved payment methods</p>
          <p className="text-sm text-sand-600 mt-1 max-w-sm mx-auto">
            Save a card or mobile money number to check out in one tap. You can also save one while paying.
          </p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4" aria-label="Saved payment methods">
          {methods.map(m => (
            <li key={m.id} className="flex flex-col">
              <div
                className={cn(
                  'relative rounded-2xl p-5 text-white bg-gradient-to-br shadow-card-md aspect-[1.7/1] flex flex-col justify-between overflow-hidden',
                  m.kind === 'card' ? (CARD_STYLE[m.brand ?? ''] ?? 'from-sand-800 to-sand-600') : (MOMO_STYLE[m.momo_network ?? ''] ?? 'from-sand-800 to-sand-600'),
                )}
              >
                <span className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
                <div className="flex items-start justify-between gap-2 relative">
                  {m.kind === 'card'
                    ? <span className="w-10 h-7 rounded-md bg-gradient-to-br from-gold-100 to-gold-300 opacity-90" aria-hidden="true" />
                    : <Smartphone className="w-6 h-6 opacity-90" aria-hidden="true" />}
                  <span className="flex items-center gap-1.5">
                    {m.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                        <Star className="w-3 h-3" aria-hidden="true" /> Default
                      </span>
                    )}
                    {m.provider === 'demo' && (
                      <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold">Test</span>
                    )}
                  </span>
                </div>
                <div className="relative">
                  <p className="font-mono text-lg tracking-widest">
                    {m.kind === 'card' ? `•••• •••• •••• ${m.last4}` : maskPhone(m.momo_phone)}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2 text-xs">
                    <span className="uppercase tracking-wide truncate opacity-90">
                      {m.kind === 'card' ? (m.holder_name || 'Card holder') : m.momo_network}
                    </span>
                    {m.kind === 'card'
                      ? <span className="flex items-center gap-2"><span className="opacity-90">{formatExpiry(m.exp_month, m.exp_year)}</span><CardBrandMark brand={m.brand} className="w-10 h-6" /></span>
                      : <MomoMark network={m.momo_network} className="w-10 h-6" />}
                  </div>
                </div>
              </div>
              <p className="sr-only">{paymentMethodLabel(m)}{m.is_default ? ', default' : ''}</p>
              <div className="mt-2 flex items-center gap-2">
                {!m.is_default && (
                  <button
                    type="button"
                    onClick={() => makeDefaultMethod(m)}
                    disabled={busyId === m.id}
                    aria-label={`Make ${paymentMethodLabel(m)} your default`}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-sand-200 bg-white text-xs font-semibold text-sand-700 hover:bg-sand-50 disabled:opacity-60 transition-colors"
                  >
                    {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Star className="w-3.5 h-3.5" aria-hidden="true" />}
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRemoving(m)}
                  aria-label={`Remove ${paymentMethodLabel(m)}`}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-sand-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => openAdd('card')}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add a card
        </button>
        <button
          type="button"
          onClick={() => openAdd('momo')}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl border-2 border-green-600 bg-white text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors"
        >
          <Smartphone className="w-4 h-4" aria-hidden="true" /> Add mobile money
        </button>
      </div>

      <p className="text-xs text-sand-600 leading-relaxed">
        SWK Marketplace never stores a full card number or security code. We keep only the card type, last 4
        digits and expiry, or your mobile money network and number.
      </p>

      <Modal
        open={adding !== null}
        onClose={() => { if (!saving) setAdding(null) }}
        title={adding === 'card' ? 'Add a card' : 'Add mobile money'}
        description={adding === 'card'
          ? 'We check the card with a test payment of GHS 0.00. Only the test cards listed work.'
          : 'Save your wallet to pay in one tap. You approve each payment on your phone.'}
      >
        <form onSubmit={save} noValidate className="space-y-4">
          {adding === 'card'
            ? <CardFields value={card} onChange={setCard} errors={cardErrors} idPrefix="add-card" defaultName={defaultName} />
            : <MomoFields value={momo} onChange={setMomo} errors={momoErrors} idPrefix="add-momo" />}

          {otp.needed && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-3">
              <label htmlFor="add-card-otp" className="form-label">One-time code</label>
              <p className="text-xs text-teal-800 mb-2">{otp.message}</p>
              <input
                id="add-card-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp.code}
                onChange={e => setOtp(o => ({ ...o, code: e.target.value.replace(/\D/g, '') }))}
                className="form-input font-mono tracking-[0.4em] text-center"
                placeholder="••••••"
                autoFocus
              />
              {otp.error && <p role="alert" className="form-error">{otp.error}</p>}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-sand-700 cursor-pointer">
            <input type="checkbox" checked={makeDefault} onChange={e => setMakeDefault(e.target.checked)} className="w-4 h-4 accent-green-600" />
            Make this my default
          </label>

          {formError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(null)}
              disabled={saving}
              className="min-h-[44px] px-4 rounded-xl border-2 border-sand-200 bg-white text-sm font-medium text-sand-700 hover:bg-sand-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (otp.needed && otp.code.length < 4)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {otp.needed ? 'Verify and save' : adding === 'card' ? 'Save card' : 'Save number'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => { if (removing) await remove(removing) }}
        title="Remove this payment method?"
        description="You can add it again at any time."
        details={removing ? [
          { label: 'Method', value: paymentMethodLabel(removing) },
          { label: removing.kind === 'card' ? 'Expires' : 'Network', value: removing.kind === 'card' ? formatExpiry(removing.exp_month, removing.exp_year) : (removing.momo_network ?? '') },
        ] : []}
        confirmLabel="Remove"
        tone="danger"
      />
    </div>
  )
}
