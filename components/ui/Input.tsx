import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  hint?:     string
  /** Optional leading icon rendered inside the left edge of the input */
  leftIcon?: React.ReactNode
  /** Optional trailing element (icon, button) inside the right edge */
  rightElement?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightElement, className, id, ...props },
  ref,
) {
  // Generate a stable id if none provided so label htmlFor works
  const inputId = id ?? React.useId()

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {props.required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={!!error}
          className={cn(
            'form-input',
            leftIcon    && 'pl-9',
            rightElement && 'pr-10',
            error && 'border-red-400 focus:ring-red-500 bg-red-50/30',
            className,
          )}
          {...props}
        />

        {rightElement && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400">
            {rightElement}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-sand-500">
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  hint?:   string
  /** Visible row count; defaults to 4 */
  rows?:   number
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, rows = 4, ...props },
  ref,
) {
  const textareaId = id ?? React.useId()

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label}
          {props.required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-describedby={
          error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
        }
        aria-invalid={!!error}
        className={cn(
          'form-input resize-y min-h-[80px]',
          error && 'border-red-400 focus:ring-red-500 bg-red-50/30',
          className,
        )}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} className="form-error" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${textareaId}-hint`} className="mt-1 text-xs text-sand-500">
          {hint}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'
