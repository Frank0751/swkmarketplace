import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms and conditions for buyers and vendors on SWK Marketplace — Ghana\'s youth-powered sustainable marketplace.',
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

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container-app section">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-3">
            Terms &amp; Conditions
          </h1>
          <p className="text-sand-500 mb-10">
            Last updated: July 2026 · These terms govern your use of SWK Marketplace,
            operated by SWK Ghana, a youth-focused nonprofit organisation based in Accra, Ghana.
          </p>

          <Section number="1" title="About SWK Marketplace">
            <p>
              SWK Marketplace (marketplace.swkghana.org) is a curated digital marketplace connecting
              eco-conscious buyers with verified youth-led green entrepreneurs across Ghana and Africa.
              Every product listed must align with UN Sustainable Development Goal 12 — Responsible
              Consumption and Production.
            </p>
            <p>
              By creating an account, listing a product, or placing an order, you agree to these terms.
            </p>
          </Section>

          <Section number="2" title="How transactions work (escrow)">
            <p>
              All transactions are managed by SWK Ghana. When a buyer pays for an order, the funds are
              held securely by SWK Ghana in escrow. The vendor fulfils the order, and only after the
              buyer confirms delivery is the payment released to the vendor.
            </p>
            <p>
              Buyers should not attempt to contact vendors or pay for marketplace products outside the
              platform. Transactions conducted off-platform are not protected by SWK Ghana.
            </p>
          </Section>

          <Section number="3" title="Vendor terms">
            <p>To sell on SWK Marketplace, vendors must:</p>
            <ul className="list-disc ml-5 space-y-1.5">
              <li>Be approved by the SWK Ghana team before listing any product</li>
              <li>Offer products that are eco-friendly and sustainably sourced or produced</li>
              <li>Not use harmful chemicals, non-biodegradable materials, or damaging processes</li>
              <li>Provide accurate product descriptions, pricing, and stock information</li>
              <li>Fulfil confirmed orders promptly and in the condition described</li>
            </ul>
            <p>
              SWK Ghana charges a <strong>15% service commission</strong> on each sale facilitated through
              the marketplace. The commission is deducted before the vendor payout is released. This fee
              supports the platform and SWK Ghana&rsquo;s youth development programmes.
            </p>
            <p>
              All listings are reviewed for SDG 12 alignment before going live. SWK Ghana reserves the
              right to reject or remove any listing, or suspend any vendor account, that does not comply
              with our sustainability criteria or these terms.
            </p>
          </Section>

          <Section number="4" title="Buyer terms">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>Payment is made to SWK Ghana at checkout via our secure payment provider (Paystack)</li>
              <li>Funds are held in escrow until you confirm delivery of your order</li>
              <li>Please confirm delivery promptly once your order arrives as described</li>
              <li>
                If an order does not arrive or differs significantly from its description, raise a
                dispute from your dashboard instead of confirming delivery — SWK Ghana will investigate
                and, where appropriate, issue a refund
              </li>
            </ul>
          </Section>

          <Section number="5" title="Reviews">
            <p>
              Only buyers who have completed and confirmed delivery of an order may review the product.
              Reviews must be honest and respectful. SWK Ghana may remove reviews that are fraudulent,
              abusive, or unrelated to the product.
            </p>
          </Section>

          <Section number="6" title="Accounts">
            <p>
              You are responsible for the accuracy of your account information and the security of your
              password. SWK Ghana may suspend accounts involved in fraud, misrepresentation,
              greenwashing, or abuse of the platform.
            </p>
          </Section>

          <Section number="7" title="Liability">
            <p>
              SWK Ghana acts as a trusted intermediary between buyers and vendors. While we verify
              vendors and curate listings, products are produced and fulfilled by independent
              entrepreneurs. SWK Ghana&rsquo;s liability for any transaction is limited to the amount
              paid for the relevant order.
            </p>
          </Section>

          <Section number="8" title="Changes to these terms">
            <p>
              We may update these terms from time to time. Material changes will be announced on the
              platform. Continued use of SWK Marketplace after changes take effect constitutes
              acceptance of the updated terms.
            </p>
          </Section>

          <Section number="9" title="Contact">
            <p>
              Questions about these terms? Contact SWK Ghana at{' '}
              <a href="mailto:info@swkghana.org" className="text-green-600 hover:underline">
                info@swkghana.org
              </a>{' '}
              · Accra, Greater Accra Region, Ghana.
            </p>
            <p>
              See also our{' '}
              <Link href="/privacy" className="text-green-600 hover:underline">
                Privacy Policy
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
