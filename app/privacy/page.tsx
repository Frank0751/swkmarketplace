import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SWK Marketplace collects, uses, and protects your personal data.',
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-bold text-sand-900 mb-3">
        <span className="text-green-600 mr-2">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm text-sand-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="container-app section">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-sand-500 mb-10">
            Last updated: July 2026 · SWK Ghana is committed to protecting the privacy of every buyer
            and vendor on SWK Marketplace.
          </p>

          <Section number="1" title="What we collect">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>
                <strong>Account data:</strong> name, email address, phone number, and password (stored
                as a secure hash by our authentication provider)
              </li>
              <li>
                <strong>Vendor data:</strong> business name, description, location, sustainability
                statement, and verification documents you submit with your application
              </li>
              <li>
                <strong>Order data:</strong> products ordered, delivery address and region, and order
                history
              </li>
              <li>
                <strong>Payment data:</strong> payments are processed by Paystack, SWK Ghana never
                sees or stores your card or mobile money credentials
              </li>
            </ul>
          </Section>

          <Section number="2" title="How we use your data">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>To operate the marketplace: process orders, hold escrow, and release vendor payouts</li>
              <li>To verify vendors and review product listings for SDG 12 alignment</li>
              <li>To send transactional emails (order updates, payout notifications, application decisions)</li>
              <li>To keep the platform safe: fraud prevention, dispute resolution, and audit logs</li>
            </ul>
            <p>We do not sell your personal data to anyone.</p>
          </Section>

          <Section number="3" title="Who we share it with">
            <ul className="list-disc ml-5 space-y-1.5">
              <li><strong>Vendors</strong> see the delivery details needed to fulfil your order</li>
              <li><strong>Paystack</strong> processes payments on our behalf</li>
              <li><strong>Service providers</strong> that host our infrastructure (Supabase, Vercel, Cloudinary, Brevo)</li>
              <li><strong>Authorities</strong> where required by Ghanaian law</li>
            </ul>
          </Section>

          <Section number="4" title="Your rights">
            <p>
              You may access, correct, or request deletion of your personal data at any time by
              contacting{' '}
              <a href="mailto:info@swkghana.org" className="text-green-600 hover:underline">
                info@swkghana.org
              </a>
              . Note that we may need to retain certain records (e.g. completed order history) to meet
              legal and accounting obligations.
            </p>
          </Section>

          <Section number="5" title="Data security">
            <p>
              Data is stored with row-level security controls, transmitted over HTTPS, and access to
              administrative systems is restricted to authorised SWK Ghana staff.
            </p>
          </Section>

          <Section number="6" title="Contact">
            <p>
              Privacy questions? Reach us at{' '}
              <a href="mailto:info@swkghana.org" className="text-green-600 hover:underline">
                info@swkghana.org
              </a>{' '}
              · Accra, Greater Accra Region, Ghana.
            </p>
            <p>
              See also our{' '}
              <Link href="/terms" className="text-green-600 hover:underline">
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  )
}
