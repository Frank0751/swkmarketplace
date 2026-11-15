import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ContactForm } from '@/components/contact/ContactForm'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Get in touch with the SWK Ghana team: questions about orders, vendors, or the marketplace.',
  openGraph: {
    title: 'Contact SWK Marketplace',
    description: 'Get in touch with the SWK Ghana team.',
    url: 'https://marketplace.swkghana.org/contact',
    siteName: 'SWK Marketplace',
  },
}

const CHANNELS = [
  { title: 'Email us', detail: 'info@swkghana.org', href: 'mailto:info@swkghana.org', external: false },
  { title: 'WhatsApp community', detail: 'Join on WhatsApp', href: 'https://chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu', external: true },
  { title: 'SWK Ghana', detail: 'swkghana.org', href: 'https://swkghana.org', external: false },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main id="main">
        <section className="section">
          <div className="container-app max-w-5xl">
            <div className="max-w-2xl mb-10">
              <h1 className="title-page">Contact us</h1>
              <span className="rule mt-4" aria-hidden="true" />
              <p className="mt-4 text-base text-sand-700 leading-relaxed">
                A question about an order, selling here, or anything else? Send a message and the SWK Ghana
                team will reply by email.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
              <div className="md:col-span-3 panel p-6 md:p-8">
                <ContactForm />
              </div>

              <ul className="md:col-span-2 divide-y divide-sand-200 border-y border-sand-200">
                {CHANNELS.map(c => (
                  <li key={c.title}>
                    <a
                      href={c.href}
                      target={c.external ? '_blank' : undefined}
                      rel={c.external ? 'noopener noreferrer' : undefined}
                      className="group block py-4"
                    >
                      <span className="block text-sm text-sand-600">{c.title}</span>
                      <span className="mt-0.5 block text-base font-bold text-green-800 group-hover:underline underline-offset-2">{c.detail}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
