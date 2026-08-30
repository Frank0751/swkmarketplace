'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:    z.string().min(2, 'Please enter your name'),
  email:   z.string().email('Please enter a valid email address'),
  subject: z.string().min(2, 'Please add a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  // Honeypot, hidden from real users, see the input below
  company: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactForm() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setSent(true)
        reset()
      } else {
        toast.error(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Could not send your message. Please check your connection and try again.')
    }
  }

  if (sent) {
    return (
      <div className="text-center py-10">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-1">
          Message sent!
        </h2>
        <p className="text-sm text-sand-600 max-w-sm mx-auto">
          Thanks for reaching out. The SWK Ghana team will get back to you shortly.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-medium text-green-600 hover:text-green-700 hover:underline transition-colors"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Honeypot: hidden from people, tempting to bots. Submissions that fill
          this in are silently discarded server-side. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] w-px h-px opacity-0"
        {...register('company')}
      />

      <div>
        <label htmlFor="name" className="form-label">
          Your name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Kwame Mensah"
          className={cn('form-input', errors.name && 'border-red-400 focus:ring-red-400/20')}
          {...register('name')}
        />
        {errors.name && <p className="form-error">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="form-label">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={cn('form-input', errors.email && 'border-red-400 focus:ring-red-400/20')}
          {...register('email')}
        />
        {errors.email && <p className="form-error">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="subject" className="form-label">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          placeholder="How can we help?"
          className={cn('form-input', errors.subject && 'border-red-400 focus:ring-red-400/20')}
          {...register('subject')}
        />
        {errors.subject && <p className="form-error">{errors.subject.message}</p>}
      </div>

      <div>
        <label htmlFor="message" className="form-label">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          placeholder="Tell us what's on your mind…"
          className={cn('form-input resize-none', errors.message && 'border-red-400 focus:ring-red-400/20')}
          {...register('message')}
        />
        {errors.message && <p className="form-error">{errors.message.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3',
          'bg-green-600 hover:bg-green-700 active:bg-green-800',
          'text-white font-medium text-sm',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Send message'
        )}
      </button>
    </form>
  )
}
