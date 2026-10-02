import type { Metadata } from 'next'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ContactForm } from '@/components/contact/ContactForm'
import { SectionHeading } from '@/components/marketplace/SectionHeading'

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
  { title: 'WhatsApp community', detail: 'Join the conversation', href: 'https://chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu', external: true },
  { title: 'SWK Ghana', detail: 'swkghana.org', href: 'https://swkghana.org', external: false },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main id="main">
        <section className="section">
          <div className="container-app max-w-5xl">
            <SectionHeading
              as="h1"
              eyebrow="Contact"
              title="Get in touch"
              subtitle="Questions about an order, becoming a vendor, or anything else? Send us a message and the SWK Ghana team will get back to you."
              className="mb-12"
            />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
              <div className="md:col-span-3 bg-white rounded-2xl border border-sand-200 shadow-card p-6 md:p-8">
                <ContactForm />
              </div>

              <ul className="md:col-span-2 space-y-4">
                {CHANNELS.map(c => (
                  <li key={c.title}>
                    <a
                      href={c.href}
                      target={c.external ? '_blank' : undefined}
                      rel={c.external ? 'noopener noreferrer' : undefined}
                      className="card-accent block p-5 rounded-2xl bg-white border border-sand-200 hover:border-green-300 hover:shadow-card-md transition-all"
                    >
                      <span className="eyebrow">{c.title}</span>
                      <span className="mt-2 block text-base font-semibold text-sand-900">{c.detail}</span>
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
