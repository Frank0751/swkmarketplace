'use client'

import { Lock, FlaskConical } from 'lucide-react'
import {
  TEST_CARDS,
  detectBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiryInput,
} from '@/lib/payments/test-cards'
import { cardNumberHint, type CardErrors, type CardFormValue } from '@/lib/payments/forms'
import { CardBrandMark } from '@/components/checkout/PaymentMarks'
import { cn } from '@/lib/utils'

interface CardFieldsProps {
  value: CardFormValue
  onChange: (value: CardFormValue) => void
  errors: CardErrors
  idPrefix: string
  /** Fills "Name on card" when a test card is picked */
  defaultName?: string
}

/**
 * Card details for the test payment. Only the listed test cards work, and the
 * number stays in this page: the server gets which test card it was, its last
 * 4 digits and expiry. Autofill is off so a browser never offers a real card.
 */
export function CardFields({ value, onChange, errors, idPrefix, defaultName }: CardFieldsProps) {
  const digits = digitsOnly(value.number)
  const brand = detectBrand(digits)
  const liveHint = !errors.number ? cardNumberHint(value.number) : null
  const set = (patch: Partial<CardFormValue>) => onChange({ ...value, ...patch })

  function fillTestCard(number: string) {
    const nextYear = (new Date().getFullYear() + 3) % 100
    onChange({
      number: formatCardNumber(number),
      expiry: `12/${String(nextYear).padStart(2, '0')}`,
      cvc: '123',
      name: value.name.trim() || defaultName || 'Test Buyer',
    })
  }

  const err = (field: keyof CardFormValue) => errors[field]
  const describedBy = (field: keyof CardFormValue) => (err(field) ? `${idPrefix}-${field}-error` : undefined)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-number`} className="form-label">Card number</label>
        <div className="relative">
          <input
            id={`${idPrefix}-number`}
            name="test-card-number"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="4084 0840 8408 4081"
            value={value.number}
            onChange={e => set({ number: formatCardNumber(e.target.value) })}
            aria-invalid={!!err('number') || undefined}
            aria-describedby={describedBy('number') ?? (liveHint ? `${idPrefix}-number-hint` : undefined)}
            className={cn('form-input pr-16 font-mono tracking-wide', err('number') && 'border-red-400 focus:ring-red-400/30')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <CardBrandMark brand={brand} />
          </span>
        </div>
        {err('number') && <p id={`${idPrefix}-number-error`} className="form-error">{err('number')}</p>}
        {!err('number') && liveHint && <p id={`${idPrefix}-number-hint`} className="form-error">{liveHint}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-expiry`} className="form-label">Expiry date</label>
          <input
            id={`${idPrefix}-expiry`}
            name="test-card-expiry"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/YY"
            maxLength={7}
            value={value.expiry}
            onChange={e => set({ expiry: formatExpiryInput(e.target.value) })}
            aria-invalid={!!err('expiry') || undefined}
            aria-describedby={describedBy('expiry')}
            className={cn('form-input font-mono', err('expiry') && 'border-red-400 focus:ring-red-400/30')}
          />
          {err('expiry') && <p id={`${idPrefix}-expiry-error`} className="form-error">{err('expiry')}</p>}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-cvc`} className="form-label">Security code</label>
          <input
            id={`${idPrefix}-cvc`}
            name="test-card-cvc"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            maxLength={4}
            value={value.cvc}
            onChange={e => set({ cvc: digitsOnly(e.target.value).slice(0, 4) })}
            aria-invalid={!!err('cvc') || undefined}
            aria-describedby={describedBy('cvc') ?? `${idPrefix}-cvc-hint`}
            className={cn('form-input font-mono', err('cvc') && 'border-red-400 focus:ring-red-400/30')}
          />
          {err('cvc')
            ? <p id={`${idPrefix}-cvc-error`} className="form-error">{err('cvc')}</p>
            : <p id={`${idPrefix}-cvc-hint`} className="mt-1 text-[11px] text-sand-600">3 digits on the back</p>}
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-name`} className="form-label">Name on card</label>
        <input
          id={`${idPrefix}-name`}
          name="test-card-name"
          autoComplete="off"
          placeholder="As printed on the card"
          value={value.name}
          onChange={e => set({ name: e.target.value })}
          aria-invalid={!!err('name') || undefined}
          aria-describedby={describedBy('name')}
          className={cn('form-input', err('name') && 'border-red-400 focus:ring-red-400/30')}
        />
        {err('name') && <p id={`${idPrefix}-name-error`} className="form-error">{err('name')}</p>}
      </div>

      <div className="rounded-xl border border-gold-200 bg-gold-50/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-900">
          <FlaskConical className="w-3.5 h-3.5 text-gold-600" aria-hidden="true" />
          Test cards: pick one to fill the form
        </p>
        <ul className="mt-2 space-y-1.5">
          {TEST_CARDS.map(card => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => fillTestCard(card.number)}
                className="w-full flex items-center gap-2.5 rounded-lg bg-white border border-gold-100 px-2.5 py-2 text-left hover:border-gold-300 hover:bg-gold-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                <CardBrandMark brand={card.brand} className="w-10 h-6" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs text-sand-900">{formatCardNumber(card.number)}</span>
                  <span className="block text-[11px] text-sand-600">{card.description}</span>
                </span>
                <span className="text-[11px] font-semibold text-green-700 flex-shrink-0">Use</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-sand-600">
        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
        Your card number and security code never leave this page. Only the card type, last 4 digits and
        expiry are kept, so you can pay faster next time.
      </p>
    </div>
  )
}
