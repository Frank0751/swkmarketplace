'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface DetailRow {
  label: string
  value: string
  /** Renders larger and bolder, for the headline figure (usually the amount) */
  emphasis?: boolean
}

interface ConfirmDialogProps {
  open:     boolean
  onClose:  () => void
  /** Runs on confirm. The dialog stays open and shows a spinner until it settles. */
  onConfirm: () => Promise<void> | void
  title:     string
  /** Plain-language explanation of what is about to happen. */
  description: string
  /** Key facts restated so the person can check them before committing. */
  details?: DetailRow[]
  /** Shown in a warning panel, e.g. "This cannot be undone." */
  warning?: string
  confirmLabel?: string
  cancelLabel?:  string
  tone?: 'primary' | 'danger'
}

/**
 * Confirmation step for actions that move money or cannot be reversed.
 * Restates the amount and counterparty rather than asking "are you sure?",
 * so the person can catch a wrong row before committing.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  details,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  tone         = 'primary',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
    >
      {details && details.length > 0 && (
        <dl className="rounded-xl border border-sand-200 bg-sand-50 divide-y divide-sand-200 mb-4">
          {details.map(({ label, value, emphasis }) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="text-xs text-sand-600">{label}</dt>
              <dd
                className={cn(
                  'text-right',
                  emphasis
                    ? 'text-base font-bold text-sand-900'
                    : 'text-sm font-medium text-sand-800',
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {warning && (
        <p className="flex items-start gap-2 rounded-xl bg-gold-50 border border-gold-200 px-3 py-2.5 mb-4 text-xs text-gold-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" aria-hidden="true" />
          <span>{warning}</span>
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className={cn(
            'min-h-[44px] px-4 rounded-xl border-2 border-sand-200 bg-white',
            'text-sm font-medium text-sand-700',
            'hover:bg-sand-50 hover:border-sand-300 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={cn(
            'min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white',
            'inline-flex items-center justify-center gap-2 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            tone === 'danger'
              ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600'
              : 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-600',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
