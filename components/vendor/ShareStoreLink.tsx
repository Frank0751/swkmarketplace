'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ShareStoreLinkProps {
  slug: string
  businessName: string
  /** "card" = full dashboard card, "row" = compact button row for the store page */
  variant?: 'card' | 'row'
}

function storeUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/store/${slug}`
  }
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'}/store/${slug}`
}

export function ShareStoreLink({ slug, businessName, variant = 'row' }: ShareStoreLinkProps) {
  const [copied, setCopied] = useState(false)

  const url = storeUrl(slug)
  const shareText = `Shop sustainable products from ${businessName} on SWK Marketplace 🌿`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Store link copied!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy, long-press the link to copy manually')
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text: shareText, url })
      } catch {
        // user dismissed the sheet, nothing to do
      }
    } else {
      handleCopy()
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors',
          copied
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-white text-sand-700 border border-sand-200 hover:border-green-300 hover:text-green-700',
        )}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#25D366] text-white hover:opacity-90 transition-opacity"
      >
        {/* WhatsApp glyph */}
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35zM12.05 21.79h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.9 7c0 5.45-4.45 9.87-9.9 9.87zm8.42-18.3A11.8 11.8 0 0 0 12.04 0C5.46 0 .1 5.35.1 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.93 11.93 0 0 0 5.76 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.18-3.5-8.4z" />
        </svg>
        WhatsApp
      </a>

      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    </div>
  )

  if (variant === 'row') {
    return buttons
  }

  return (
    <div className="bg-white rounded-xl border border-green-200 p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="w-4 h-4 text-green-600" />
        <h2 className="text-sm font-bold text-sand-900">Your store link</h2>
      </div>
      <p className="text-xs text-sand-500 mb-3">
        Share this link anywhere, WhatsApp, Instagram bio, business cards. Anyone can open it
        and see your full store, no login needed. It&rsquo;s your mini-website.
      </p>
      <div className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 mb-3 overflow-x-auto">
        <code className="text-xs text-green-700 font-semibold whitespace-nowrap">{url}</code>
      </div>
      {buttons}
    </div>
  )
}
