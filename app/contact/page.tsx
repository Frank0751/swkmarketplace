import type { Metadata } from 'next'
import { Mail, MessageCircle, MapPin } from 'lucide-react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ContactForm } from '@/components/contact/ContactForm'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Contact us | SWK Marketplace',
  description:
    'Get in touch with the SWK Ghana team — questions about orders, vendors, or the marketplace.',
  openGraph: {
    title: 'Contact SWK Marketplace',
    description: 'Get in touch with the SWK Ghana team.',
    url: 'https://marketplace.swkghana.org/contact',
    siteName: 'SWK Marketplace',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        <section className="section">
          <div className="container-app max-w-5xl">
            <div className="text-center mb-12">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-3">
                Get in touch
              </h1>
              <p className="text-sand-600 max-w-xl mx-auto">
                Questions about an order, becoming a vendor, or anything else? Send us a message
                and the SWK Ghana team will get back to you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
              {/* Form */}
              <div className="md:col-span-3 bg-white rounded-2xl border border-sand-200 shadow-card p-6 md:p-8">
                <ContactForm />
              </div>

              {/* Direct contact info */}
              <div className="md:col-span-2 space-y-5">
                <a
                  href="mailto:info@swkghana.org"
                  className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-sand-200 hover:border-green-300 hover:shadow-card transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sand-900">Email us</p>
                    <p className="text-sm text-sand-600">info@swkghana.org</p>
                  </div>
                </a>

                <a
                  href="https://chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-sand-200 hover:border-green-300 hover:shadow-card transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sand-900">WhatsApp community</p>
                    <p className="text-sm text-sand-600">Join the conversation</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-5 rounded-2xl bg-white border border-sand-200">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sand-900">SWK Ghana</p>
                    <p className="text-sm text-sand-600">Ghana &amp; across Africa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
