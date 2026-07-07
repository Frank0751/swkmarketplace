'use client'

const MESSAGES = [
  { icon: '🌿', text: 'Every product is SDG 12-verified before going live' },
  { icon: '🛡️', text: 'All payments are escrow-protected, your money is safe' },
  { icon: '✊', text: '100% youth-led green entrepreneurs' },
  { icon: '📍', text: 'Shipping across Ghana and Africa' },
  { icon: '♻️', text: 'Supporting responsible consumption since 2022' },
  { icon: '💚', text: 'Every purchase empowers a young Ghanaian entrepreneur' },
]

export function AnnouncementBar() {
  const doubled = [...MESSAGES, ...MESSAGES]

  return (
    <div className="bg-green-600 text-white overflow-hidden h-9 flex items-center">
      <div
        className="flex items-center gap-12 animate-marquee"
        style={{ width: 'max-content' }}
      >
        {doubled.map((msg, i) => (
          <span key={i} className="announce-item text-xs font-medium">
            <span>{msg.icon}</span>
            <span>{msg.text}</span>
            <span className="text-green-300 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
