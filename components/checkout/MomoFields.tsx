'use client'

import { MOMO_NETWORKS, guessMomoNetwork } from '@/lib/payments/methods'
import type { MomoErrors, MomoFormValue } from '@/lib/payments/forms'
import { MomoMark } from '@/components/checkout/PaymentMarks'
import { cn } from '@/lib/utils'

interface MomoFieldsProps {
  value: MomoFormValue
  onChange: (value: MomoFormValue) => void
  errors: MomoErrors
  idPrefix: string
}

/** Mobile money network and number. Typing the number picks the network. */
export function MomoFields({ value, onChange, errors, idPrefix }: MomoFieldsProps) {
  function setPhone(phone: string) {
    const guessed = guessMomoNetwork(phone)
    onChange({ phone, network: guessed ?? value.network })
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="form-label">Network</legend>
        <div className="grid grid-cols-3 gap-2">
          {MOMO_NETWORKS.map(n => {
            const checked = value.network === n.id
            return (
              <label
                key={n.id}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 cursor-pointer transition-colors text-center',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 has-[:focus-visible]:ring-offset-2',
                  checked ? 'border-green-600 bg-green-50' : 'border-sand-200 bg-white hover:border-sand-300',
                )}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-network`}
                  value={n.id}
                  checked={checked}
                  onChange={() => onChange({ ...value, network: n.id })}
                  className="sr-only"
                />
                <MomoMark network={n.id} />
                <span className="text-xs font-semibold text-sand-900 leading-tight">{n.id}</span>
              </label>
            )
          })}
        </div>
        {errors.network && <p className="form-error">{errors.network}</p>}
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-phone`} className="form-label">Mobile money number</label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="024 123 4567"
          value={value.phone}
          onChange={e => setPhone(e.target.value)}
          aria-invalid={!!errors.phone || undefined}
          aria-describedby={errors.phone ? `${idPrefix}-phone-error` : `${idPrefix}-phone-hint`}
          className={cn('form-input', errors.phone && 'border-red-400 focus:ring-red-400/30')}
        />
        {errors.phone
          ? <p id={`${idPrefix}-phone-error`} className="form-error">{errors.phone}</p>
          : <p id={`${idPrefix}-phone-hint`} className="mt-1 text-[11px] text-sand-600">
              You’ll be asked to approve the payment. For sample orders the prompt appears on this screen.
            </p>}
      </div>
    </div>
  )
}
