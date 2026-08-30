'use client'

import { BadgeCheck, ShieldCheck, Users, Truck, Recycle, HeartHandshake } from 'lucide-react'

const MESSAGES = [
  { icon: BadgeCheck, text: 'Every product is SDG 12-verified before going live' },
  { icon: ShieldCheck, text: 'All payments are escrow-protected, your money is safe' },
  { icon: Users, text: '100% youth-led green entrepreneurs' },
  { icon: Truck, text: 'Shipping across Ghana and Africa' },
  { icon: Recycle, text: 'Supporting responsible consumption since 2022' },
  { icon: HeartHandshake, text: 'Every purchase empowers a young Ghanaian entrepreneur' },
]

export function AnnouncementBar() {
  const doubled = [...MESSAGES, ...MESSAGES]

  return (
    <div className="bg-green-600 text-white overflow-hidden h-9 flex items-center">
      <div
        className="flex items-center gap-12 animate-marquee"
        style={{ width: 'max-content' }}
      >
        {doubled.map((msg, i) => {
          const Icon = msg.icon
          return (
            <span key={i} className="announce-item text-xs font-medium">
              <Icon className="w-3.5 h-3.5 text-green-200" aria-hidden="true" />
              <span>{msg.text}</span>
              <span className="text-green-300 mx-2">·</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
