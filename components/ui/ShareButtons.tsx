'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ShareButtonsProps {
  url: string
  title: string
  /** Placed before the link in WhatsApp and the phone's share sheet */
  text: string
  className?: string
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('fill-current', className)} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35zM12.05 21.79h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.9 7c0 5.45-4.45 9.87-9.9 9.87zm8.42-18.3A11.8 11.8 0 0 0 12.04 0C5.46 0 .1 5.35.1 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.93 11.93 0 0 0 5.76 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.18-1.24-6.18-3.5-8.4z" />
    </svg>
  )
}

/**
 * Copy / WhatsApp / native share. Most links in Ghana travel over WhatsApp,
 * so it gets its own button rather than hiding in the share sheet.
 */
export function ShareButtons({ url, title, text, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy, long-press the link to copy it instead')
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // user dismissed the sheet, nothing to do
      }
    } else {
      handleCopy()
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-[#1FA855] text-white hover:bg-[#178a45] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
      >
        <WhatsAppGlyph className="w-4 h-4" />
        WhatsApp
        <span className="sr-only">(opens WhatsApp to share)</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
          copied
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-white text-sand-700 border border-sand-200 hover:border-green-300 hover:text-green-700',
        )}
      >
        {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        Share
      </button>
    </div>
  )
}
