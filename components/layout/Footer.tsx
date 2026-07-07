import Link from 'next/link'
import { Leaf, Mail, MessageCircle, ShieldCheck } from 'lucide-react'

// ─── Component ────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-green-600 text-white">
      {/* Main footer grid */}
      <div className="container-app py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-base font-display font-semibold text-white leading-tight">SWK Marketplace</div>
                <div className="text-[10px] font-medium text-green-200 leading-tight tracking-widest uppercase">swkghana.org</div>
              </div>
            </Link>

            <p className="text-sm text-green-100 leading-relaxed max-w-xs">
              Connecting eco-conscious buyers with verified youth-led green entrepreneurs across Ghana and Africa. Every purchase supports SDG 12 — Responsible Consumption and Production.
            </p>

            {/* SDG 12 badge */}
            <div className="inline-flex items-center gap-2 mt-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              <ShieldCheck className="w-4 h-4 text-green-200" />
              <span className="text-xs font-medium text-green-100">SDG 12 Verified Marketplace</span>
            </div>
          </div>

          {/* Explore links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-green-200 mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: '/marketplace',    label: 'Shop all products' },
                { href: '/how-it-works',   label: 'How it works' },
                { href: '/vendor/apply',   label: 'Become a vendor' },
                { href: 'https://swkghana.org', label: 'About SWK Ghana', external: true },
              ].map(({ href, label, external }) => (
                <li key={href}>
                  <Link
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-green-100 hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    {label}
                    {external && (
                      <span className="opacity-0 group-hover:opacity-60 text-[10px] transition-opacity">↗</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-green-200 mb-4">
              Get in touch
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@swkghana.org"
                  className="inline-flex items-center gap-2 text-sm text-green-100 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  info@swkghana.org
                </a>
              </li>
              <li>
                <a
                  href="https://chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-green-100 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  WhatsApp Community
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-app py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-green-200">
            &copy; {new Date().getFullYear()} SWK Ghana. All rights reserved.
          </p>
          <p className="text-xs text-green-300 font-medium italic">
            Powered by youth, for the planet.
          </p>
        </div>
      </div>
    </footer>
  )
}
