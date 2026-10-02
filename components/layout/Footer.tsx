import Link from 'next/link'
import Image from 'next/image'

const SHOP_LINKS = [
  { href: '/marketplace', label: 'All products' },
  { href: '/marketplace?category=organic_produce', label: 'Organic produce' },
  { href: '/marketplace?category=handmade_crafts', label: 'Handmade crafts' },
  { href: '/marketplace?category=recycled_upcycled', label: 'Recycled & upcycled' },
  { href: '/marketplace?category=agribusiness', label: 'Agribusiness' },
]

const HELP_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/vendor/apply', label: 'Become a vendor' },
  { href: '/contact', label: 'Contact us' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
]

function FooterLinks({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="eyebrow eyebrow-on-dark mb-4">{title}</h2>
      <ul className="space-y-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center min-h-[40px] text-sm text-green-50/90 hover:text-white transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-green-900 text-white">
      <span className="kente-band" aria-hidden="true" />

      <div className="container-app py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 group">
              <span className="rounded-xl bg-white px-2.5 py-1.5 transition-transform group-hover:scale-[1.03]">
                <Image
                  src="/images/swk-logo.png"
                  alt="SWK: Sustainability with Koomson"
                  width={69}
                  height={36}
                  className="h-9 w-auto"
                />
              </span>
              <span>
                <span className="block text-base font-bold leading-tight">SWK Marketplace</span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-green-100">by SWK Ghana</span>
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-green-50/90 max-w-xs">
              Eco-friendly products from verified youth-led businesses across Ghana. Every order is held in
              escrow until it arrives, and every listing is checked against SDG 12.
            </p>
          </div>

          <FooterLinks title="Shop" links={SHOP_LINKS} />
          <FooterLinks title="Help" links={HELP_LINKS} />

          <div>
            <h2 className="eyebrow eyebrow-on-dark mb-4">Get in touch</h2>
            <ul className="space-y-1">
              <li>
                <a href="mailto:info@swkghana.org" className="inline-flex items-center min-h-[40px] text-sm text-green-50/90 hover:text-white transition-colors">
                  info@swkghana.org
                </a>
              </li>
              <li>
                <a
                  href="https://chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[40px] text-sm text-green-50/90 hover:text-white transition-colors"
                >
                  WhatsApp community<span className="sr-only"> (opens WhatsApp)</span>
                </a>
              </li>
              <li>
                <a href="https://swkghana.org" className="inline-flex items-center min-h-[40px] text-sm text-green-50/90 hover:text-white transition-colors">
                  swkghana.org
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app py-5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs text-green-100">
          <p>&copy; {new Date().getFullYear()} SWK Ghana. All rights reserved.</p>
          <p>Powered by youth, for the planet.</p>
        </div>
      </div>
    </footer>
  )
}
