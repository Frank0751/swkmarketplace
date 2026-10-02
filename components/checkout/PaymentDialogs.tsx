'use client'

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Check } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { MomoMark } from '@/components/checkout/PaymentMarks'
import { maskPhone } from '@/lib/payments/methods'
import type { MomoNetwork } from '@/types'

// ─── Processing ───────────────────────────────────────────────────────────────

const CARD_STEPS = ['Contacting your bank', 'Authorising the payment', 'Securing your money in escrow']
const MOMO_STEPS = ['Payment approved on your phone', 'Confirming with your network', 'Securing your money in escrow']

/** A modal that can't be dismissed while a payment is in flight */
export function ProcessingDialog({ open, channel }: { open: boolean; channel: 'card' | 'momo' }) {
  const steps = channel === 'momo' ? MOMO_STEPS : CARD_STEPS
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!open) {
      setStep(0)
      return
    }
    const timer = window.setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 650)
    return () => window.clearInterval(timer)
  }, [open, steps.length])

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-sand-900/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          onEscapeKeyDown={e => e.preventDefault()}
          onPointerDownOutside={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-7 shadow-card-lg outline-none text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" aria-hidden="true" />
          </div>
          <Dialog.Title className="text-lg font-display font-bold text-sand-900">Processing your payment</Dialog.Title>
          <Dialog.Description className="text-sm text-sand-600 mt-1">Please don’t close this page.</Dialog.Description>
          <ol className="mt-5 space-y-2 text-left" aria-live="polite">
            {steps.map((label, i) => (
              <li key={label} className={cn('flex items-center gap-2.5 text-sm transition-colors', i <= step ? 'text-sand-900' : 'text-sand-400')}>
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                    i < step ? 'bg-green-600 text-white' : i === step ? 'border-2 border-green-600' : 'border-2 border-sand-200',
                  )}
                  aria-hidden="true"
                >
                  {i < step && <Check className="w-3 h-3" />}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs font-medium text-teal-700">Held in escrow until you confirm delivery</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── One-time code (card) ─────────────────────────────────────────────────────

interface OtpDialogProps {
  open: boolean
  message: string
  error?: string | null
  busy: boolean
  onSubmit: (otp: string) => void
  onCancel: () => void
}

export function OtpDialog({ open, message, error, busy, onSubmit, onCancel }: OtpDialogProps) {
  const [otp, setOtp] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setOtp('')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o && !busy) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-sand-900/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus() }}
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg outline-none"
        >
          <p className="eyebrow mb-2">Your bank</p>
          <Dialog.Title className="text-lg font-display font-bold text-sand-900">Verify this payment</Dialog.Title>
          <Dialog.Description className="text-sm text-sand-600 mt-1 leading-relaxed">{message}</Dialog.Description>
          <form
            className="mt-4 space-y-3"
            onSubmit={e => { e.preventDefault(); if (otp.trim()) onSubmit(otp.trim()) }}
          >
            <label htmlFor="otp-code" className="form-label">One-time code</label>
            <input
              ref={inputRef}
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'otp-error' : undefined}
              className={cn('form-input text-center text-xl font-mono tracking-[0.5em]', error && 'border-red-400')}
              placeholder="••••••"
            />
            {error && <p id="otp-error" role="alert" className="form-error">{error}</p>}
            <button
              type="submit"
              disabled={busy || otp.length < 4}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {busy ? 'Verifying…' : 'Verify and pay'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="w-full min-h-[44px] text-sm font-medium text-sand-600 hover:text-sand-900 transition-colors"
            >
              Cancel payment
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Mobile money prompt (simulated) ──────────────────────────────────────────

const PROMPT_SECONDS = 90

interface MomoPromptDialogProps {
  open: boolean
  network: MomoNetwork | string
  phone: string
  amount: number
  busy: boolean
  onApprove: () => void
  onDecline: (reason?: string) => void
}

/**
 * Stands in for the approval prompt that appears on the buyer's phone. On a
 * real payment the buyer approves on their handset; here it's on screen so a
 * sample order can be shown end to end.
 */
export function MomoPromptDialog({ open, network, phone, amount, busy, onApprove, onDecline }: MomoPromptDialogProps) {
  const [pin, setPin] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(PROMPT_SECONDS)
  const approveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setPin('')
    setSecondsLeft(PROMPT_SECONDS)
    const timer = window.setInterval(() => setSecondsLeft(s => s - 1), 1000)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (open && secondsLeft <= 0 && !busy) {
      onDecline('The prompt timed out before it was approved. Nothing was charged; try again.')
    }
  }, [open, secondsLeft, busy, onDecline])

  const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
  const ss = String(Math.max(secondsLeft, 0) % 60).padStart(2, '0')

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o && !busy) onDecline() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-sand-900/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={e => { e.preventDefault(); approveRef.current?.focus() }}
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card-lg outline-none"
        >
          <Dialog.Title className="text-lg font-display font-bold text-sand-900">Approve on your phone</Dialog.Title>
          <Dialog.Description className="text-xs text-sand-600 mt-1">
            We sent a payment request to {maskPhone(phone)}. Waiting for approval… {mm}:{ss}
          </Dialog.Description>

          {/* The phone */}
          <div className="mt-4 mx-auto w-full max-w-[260px] rounded-[2rem] bg-sand-900 p-3 shadow-card-lg">
            <div className="rounded-[1.5rem] bg-sand-800 px-4 pt-3 pb-4 text-white">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-sand-700" aria-hidden="true" />
              <div className="flex items-center gap-2 mb-3">
                <MomoMark network={network} className="w-10 h-6" />
                <span className="text-xs font-semibold text-sand-100">{network}</span>
              </div>
              <p className="text-[13px] leading-snug text-sand-100">
                Pay <strong className="text-white">{formatCurrency(amount)}</strong> to{' '}
                <strong className="text-white">SWK MARKETPLACE</strong>?
              </p>
              <label htmlFor="momo-pin" className="block mt-3 text-[11px] text-sand-300">Enter PIN to approve</label>
              <input
                id="momo-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="mt-1 w-full rounded-lg bg-sand-900 border border-sand-700 px-3 py-2 text-center text-lg tracking-[0.6em] text-white placeholder:text-sand-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <p className="mt-1 text-[10px] text-sand-400">Test prompt: any 4 digits, or none</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onDecline()}
                  disabled={busy}
                  className="min-h-[40px] rounded-lg border border-sand-600 text-xs font-semibold text-sand-100 hover:bg-sand-700 disabled:opacity-50 transition-colors"
                >
                  Decline
                </button>
                <button
                  ref={approveRef}
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  className="min-h-[40px] inline-flex items-center justify-center gap-1 rounded-lg bg-green-500 text-xs font-bold text-white hover:bg-green-400 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-sand-600 text-center">
            Sample order: this prompt is simulated on screen. With real payments it appears on your phone.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
