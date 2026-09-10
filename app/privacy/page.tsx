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
      <main id="main" className="container-app section">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-sand-600 mb-10">
            Last updated: September 2026 · SWK Ghana is committed to protecting the privacy of every buyer
            and vendor on SWK Marketplace, in line with Ghana&rsquo;s Data Protection Act, 2012 (Act 843).
          </p>

          <Section number="1" title="What we collect">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>
                <strong>Account data:</strong> name, email address, phone number, and password (stored
                as a secure hash by our authentication provider)
              </li>
              <li>
                <strong>Order data:</strong> products ordered, delivery address, region and phone number,
                notes to the vendor, and order history
              </li>
              <li>
                <strong>Vendor data:</strong> business name, description, location, contact number,
                sustainability statement, and any supporting photos submitted with an application
              </li>
              <li>
                <strong>Vendor payout details:</strong> the mobile money or bank account where SWK Ghana
                sends a vendor&rsquo;s earnings
              </li>
              <li>
                <strong>Payment data:</strong> payments are processed by Paystack. SWK Ghana never
                sees or stores your card or mobile money PIN
              </li>
              <li>
                <strong>Usage data:</strong> anonymous page-view and performance statistics, collected
                without cookies and without building a profile of you
              </li>
            </ul>
          </Section>

          <Section number="2" title="How we use your data">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>To operate the marketplace: process orders, hold escrow, and release vendor payouts</li>
              <li>To let the vendor arrange delivery of your order</li>
              <li>To verify vendors and review product listings for SDG 12 alignment</li>
              <li>To send transactional emails (order updates, payout notifications, application decisions)</li>
              <li>To keep the platform safe: fraud prevention, investigating reported problems, and audit logs</li>
              <li>To understand which pages work well, so we can improve the site</li>
            </ul>
            <p>We do not sell your personal data to anyone.</p>
          </Section>

          <Section number="3" title="Who we share it with">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>
                <strong>Vendors</strong> see your name, delivery address and phone number for the orders
                you place with them, so they can deliver
              </li>
              <li><strong>Paystack</strong> processes payments on our behalf</li>
              <li>
                <strong>Service providers</strong> that host and run our infrastructure: Supabase (database
                and sign-in), Vercel (hosting and anonymous analytics), Cloudinary (images and private
                vendor documents), and Brevo (email)
              </li>
              <li><strong>Authorities</strong> where required by Ghanaian law</li>
            </ul>
            <p>
              A vendor&rsquo;s business name, location, contact number and products are shown publicly on
              their store page. Supporting photos and payout details are never public: only the vendor and
              authorised SWK Ghana staff can see them.
            </p>
          </Section>

          <Section number="4" title="How long we keep it">
            <p>
              We keep your account data while your account is open. Order and payment records are kept for
              as long as Ghanaian tax and accounting rules require, then deleted or anonymised.
            </p>
          </Section>

          <Section number="5" title="Your rights">
            <p>
              Under the Data Protection Act, 2012 (Act 843), you may ask to see the personal data we hold
              about you, correct it, or have it deleted, by contacting{' '}
              <a href="mailto:info@swkghana.org" className="text-green-700 underline underline-offset-2">
                info@swkghana.org
              </a>
              . We may need to keep certain records (such as completed orders) to meet legal and accounting
              obligations. If you are unhappy with how we handle your data, you can complain to the Data
              Protection Commission of Ghana.
            </p>
          </Section>

          <Section number="6" title="Data security">
            <p>
              Data is stored with row-level security controls that limit each person to their own records,
              transmitted over HTTPS, and access to administrative systems is restricted to authorised
              SWK Ghana staff.
            </p>
          </Section>

          <Section number="7" title="Contact">
            <p>
              Privacy questions? Reach us at{' '}
              <a href="mailto:info@swkghana.org" className="text-green-700 underline underline-offset-2">
                info@swkghana.org
              </a>{' '}
              · Accra, Greater Accra Region, Ghana.
            </p>
            <p>
              See also our{' '}
              <Link href="/terms" className="text-green-700 underline underline-offset-2">
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
