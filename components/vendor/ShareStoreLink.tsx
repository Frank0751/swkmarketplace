'use client'

import { Share2 } from 'lucide-react'
import { ShareButtons } from '@/components/ui/ShareButtons'

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
  const url = storeUrl(slug)
  const buttons = (
    <ShareButtons
      url={url}
      title={businessName}
      text={`Shop sustainable products from ${businessName} on SWK Marketplace 🌿`}
    />
  )

  if (variant === 'row') {
    return buttons
  }

  return (
    <div className="bg-white rounded-xl border border-green-200 p-5 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="w-4 h-4 text-green-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-sand-900">Your store link</h2>
      </div>
      <p className="text-xs text-sand-600 mb-3">
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
