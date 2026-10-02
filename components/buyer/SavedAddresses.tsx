'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { formatGhanaPhone, normalizeGhanaPhone } from '@/lib/marketplace/phone'
import { cn } from '@/lib/utils'
import { GHANA_REGIONS, type BuyerAddress, type GhanaRegion } from '@/types'

/** Delivery addresses saved for checkout: list, add, choose the default, remove */
export function SavedAddresses() {
  const [addresses, setAddresses] = useState<BuyerAddress[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', phone: '', region: '' as GhanaRegion | '', address: '' })
  const [errors, setErrors] = useState<Partial<Record<'phone' | 'region' | 'address', string>>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('buyer_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    setAddresses((data ?? []) as BuyerAddress[])
  }, [])

  useEffect(() => { load() }, [load])

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? 'Something went wrong')
    return json
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!normalizeGhanaPhone(form.phone)) next.phone = 'Enter a Ghana phone number, e.g. 024 123 4567'
    if (!form.region) next.region = 'Choose a region'
    if (form.address.trim().length < 5) next.address = 'Enter a fuller address'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      await call('/api/addresses', 'POST', { ...form, label: form.label || undefined })
      toast.success('Address saved')
      setAdding(false)
      setForm({ label: '', phone: '', region: '', address: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the address')
    } finally {
      setSaving(false)
    }
  }

  async function makeDefault(a: BuyerAddress) {
    setBusyId(a.id)
    try {
      await call(`/api/addresses/${a.id}`, 'PATCH', { is_default: true })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(a: BuyerAddress) {
    setBusyId(a.id)
    try {
      await call(`/api/addresses/${a.id}`, 'DELETE')
      toast.success('Address removed')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-sand-200 p-6 shadow-card mb-6" aria-labelledby="addresses-heading">
      <h2 id="addresses-heading" className="text-lg font-display font-bold text-sand-900 mb-1">Saved delivery addresses</h2>
      <p className="text-sm text-sand-600 mb-4">Choose one at checkout instead of typing it again.</p>

      {addresses === null ? (
        <div role="status" className="flex items-center gap-2 text-sm text-sand-600">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading addresses…
        </div>
      ) : addresses.length === 0 && !adding ? (
        <p className="text-sm text-sand-600">No saved addresses yet. You can save one while checking out.</p>
      ) : (
        <ul className="space-y-2">
          {addresses.map(a => (
            <li key={a.id} className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-xl border border-sand-200 p-3.5">
              <div className="flex-1 min-w-0 text-sm">
                <p className="flex items-center gap-2 font-semibold text-sand-900">
                  {a.label || 'Address'}
                  {a.is_default && <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-px">Default</span>}
                </p>
                <p className="text-sand-700 mt-0.5">{a.address}, {a.region}</p>
                <p className="text-xs text-sand-600 mt-0.5">{formatGhanaPhone(a.phone)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!a.is_default && (
                  <button
                    type="button"
                    onClick={() => makeDefault(a)}
                    disabled={busyId === a.id}
                    className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-sand-200 text-xs font-semibold text-sand-700 hover:bg-sand-50 disabled:opacity-60"
                  >
                    <Star className="w-3.5 h-3.5" aria-hidden="true" /> Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(a)}
                  disabled={busyId === a.id}
                  aria-label={`Remove address ${a.label || a.address}`}
                  className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-sand-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={add} noValidate className="mt-4 space-y-3 rounded-xl border border-sand-200 bg-sand-50 p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-addr-label" className="form-label">Name <span className="font-normal text-sand-600">(optional)</span></label>
              <input id="new-addr-label" value={form.label} maxLength={40} placeholder="Home, Work…" onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label htmlFor="new-addr-phone" className="form-label">Phone</label>
              <input id="new-addr-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} placeholder="024 123 4567" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} aria-invalid={!!errors.phone || undefined} className={cn('form-input', errors.phone && 'border-red-400')} />
              {errors.phone && <p className="form-error">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="new-addr-region" className="form-label">Region</label>
            <select id="new-addr-region" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value as GhanaRegion }))} aria-invalid={!!errors.region || undefined} className={cn('form-input', errors.region && 'border-red-400')}>
              <option value="">Select a region…</option>
              {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.region && <p className="form-error">{errors.region}</p>}
          </div>
          <div>
            <label htmlFor="new-addr-address" className="form-label">Address</label>
            <textarea id="new-addr-address" rows={2} maxLength={300} value={form.address} autoComplete="street-address" placeholder="House number and street, area, landmark or GhanaPost GPS" onChange={e => setForm(f => ({ ...f, address: e.target.value }))} aria-invalid={!!errors.address || undefined} className={cn('form-input resize-none', errors.address && 'border-red-400')} />
            {errors.address && <p className="form-error">{errors.address}</p>}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save address
            </button>
            <button type="button" onClick={() => setAdding(false)} className="min-h-[44px] px-4 rounded-lg border border-sand-200 bg-white text-sm font-medium text-sand-700 hover:bg-sand-50">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border-2 border-dashed border-sand-300 text-sm font-semibold text-sand-700 hover:border-green-600 hover:text-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add an address
        </button>
      )}
    </section>
  )
}
