'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  open:         boolean
  onClose:      () => void
  title:        string
  description?: string
  children:     React.ReactNode
  size?:        ModalSize
  /** Additional classes for the panel container */
  className?:   string
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size      = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-sand-900/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            // Position
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            // Sizing
            'w-[calc(100vw-2rem)]',
            sizeClasses[size],
            // Appearance
            'bg-white rounded-2xl shadow-card-lg',
            'outline-none',
            // Animation
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
            'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
            className,
          )}
          onInteractOutside={onClose}
          onEscapeKeyDown={onClose}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-sand-100">
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-display font-semibold text-sand-900 leading-snug">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-sand-500 leading-relaxed">
                  {description}
                </Dialog.Description>
              )}
            </div>

            {/* Close button */}
            <Dialog.Close asChild>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  'flex-shrink-0 rounded-lg p-1.5 text-sand-400',
                  'hover:bg-sand-100 hover:text-sand-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
                  'transition-colors',
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
