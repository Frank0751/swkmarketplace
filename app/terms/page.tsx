import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { DELIVERY_FEE_GHS, CONFIRMATION_WINDOW_DAYS } from '@/lib/marketplace/orders'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms and conditions for buyers and vendors on SWK Marketplace, Ghana\'s youth-powered sustainable marketplace.',
}

function Section({ id, number, title, children }: { id?: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
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
      <main id="main" className="container-app section">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-sand-900 mb-3">
            Terms &amp; Conditions
          </h1>
          <p className="text-sand-600 mb-8">
            Last updated: September 2026 · These terms govern your use of SWK Marketplace,
            operated by SWK Ghana, a youth-focused nonprofit organisation based in Accra, Ghana.
          </p>

          <div className="mb-10 rounded-xl border border-green-200 bg-green-50 p-5">
            <h2 className="text-sm font-bold text-sand-900 mb-2">In brief</h2>
            <ul className="list-disc ml-5 space-y-1.5 text-sm text-sand-700">
              <li>You pay SWK Ghana, not the vendor. We hold the money until you confirm delivery.</li>
              <li>Delivery anywhere in Ghana is a flat GHS {DELIVERY_FEE_GHS}. The vendor calls you to arrange it.</li>
              <li>
                Something wrong? Don&rsquo;t confirm delivery. Press &ldquo;Report a problem&rdquo; on your order
                within {CONFIRMATION_WINDOW_DAYS} days of dispatch and we&rsquo;ll step in.
              </li>
              <li>Vendors receive 85% of each order once delivery is confirmed.</li>
            </ul>
          </div>

          <Section number="1" title="About SWK Marketplace">
            <p>
              SWK Marketplace (marketplace.swkghana.org) is a curated digital marketplace connecting
              eco-conscious buyers with verified youth-led green entrepreneurs across Ghana. Every
              product listed must align with UN Sustainable Development Goal 12, Responsible
              Consumption and Production.
            </p>
            <p>
              By creating an account, listing a product, or placing an order, you agree to these terms.
            </p>
          </Section>

          <Section number="2" title="How payment works (escrow)">
            <p>
              All payments are made to SWK Ghana through our payment provider, Paystack, by mobile money
              or card. SWK Ghana holds the money in escrow while the vendor fulfils the order, and releases
              it to the vendor only once delivery is confirmed.
            </p>
            <p>
              You are welcome to ask a vendor questions, but never pay a vendor directly. Payments made
              outside the platform are not protected by SWK Ghana.
            </p>
          </Section>

          <Section id="vendor-terms" number="3" title="Vendor terms">
            <p>To sell on SWK Marketplace, vendors must:</p>
            <ul className="list-disc ml-5 space-y-1.5">
              <li>Be approved by the SWK Ghana team before listing any product</li>
              <li>Offer products that are eco-friendly and sustainably sourced or produced</li>
              <li>Not use harmful chemicals, non-biodegradable materials, or damaging processes</li>
              <li>Provide accurate product descriptions, photos, pricing, and stock information</li>
              <li>Confirm paid orders within 24 hours and dispatch them promptly</li>
              <li>Arrange delivery with the buyer, using the phone number they give at checkout</li>
              <li>Keep their mobile money or bank payout details up to date</li>
            </ul>
            <p>
              SWK Ghana charges a <strong>15% service commission</strong>, calculated on the order total
              (including the delivery fee). It is deducted before the payout is released and supports the
              platform and SWK Ghana&rsquo;s youth development programmes. There are no listing or monthly fees.
            </p>
            <p>
              SWK Ghana sends the remaining 85% to the vendor&rsquo;s mobile money or bank account after
              delivery is confirmed. If an order is refunded following an investigation, no payout is made
              for it.
            </p>
            <p>
              All listings are reviewed for SDG 12 alignment before going live, and again when their words,
              photos or category change. SWK Ghana may reject or remove any listing, or suspend any vendor
              account, that does not meet our sustainability criteria or these terms.
            </p>
          </Section>

          <Section number="4" title="Buyer terms">
            <ul className="list-disc ml-5 space-y-1.5">
              <li>Pay at checkout through Paystack. Your money is held in escrow until you confirm delivery.</li>
              <li>Give an accurate delivery address and a phone number the vendor can reach.</li>
              <li>Check your order when it arrives, and confirm delivery once it matches its description.</li>
            </ul>
          </Section>

          <Section number="5" title="Delivery">
            <p>
              SWK Marketplace currently delivers within Ghana. Delivery costs a flat GHS {DELIVERY_FEE_GHS} per
              order, shown before you pay. The vendor arranges delivery and will call the phone number you
              gave at checkout. Vendors aim to dispatch within 1–3 business days of confirming an order, and
              you&rsquo;ll get an email when it&rsquo;s on its way.
            </p>
          </Section>

          <Section number="6" title="Confirming delivery">
            <p>
              When your order arrives, press &ldquo;Confirm delivery&rdquo; on your order page. This releases
              your payment to the vendor and cannot be undone.
            </p>
            <p>
              If you have neither confirmed delivery nor reported a problem within {CONFIRMATION_WINDOW_DAYS} days
              of the order being marked as dispatched, SWK Ghana may confirm delivery on your behalf, after
              trying to contact you and checking with the vendor, so that the vendor can be paid.
            </p>
          </Section>

          <Section number="7" title="Problems, refunds and returns">
            <p>
              If an order doesn&rsquo;t arrive, arrives damaged, or is significantly different from its
              description, don&rsquo;t confirm delivery. Press &ldquo;Report a problem&rdquo; on your order page
              within {CONFIRMATION_WINDOW_DAYS} days of dispatch. Your payment stays on hold while SWK Ghana looks
              into it with you and the vendor, usually within 2 working days.
            </p>
            <p>
              Where the problem is confirmed, SWK Ghana refunds you in full to the card or mobile money
              account you paid with. Refunds usually arrive within 3–10 working days, depending on your bank
              or network. If an item can be returned, the vendor arranges collection. Perishable goods, such as
              fresh produce, can&rsquo;t be returned, but problems with them are still covered by a refund
              where appropriate.
            </p>
            <p>
              Once you confirm delivery, the payment is released and SWK Ghana can no longer hold it back. If
              an issue appears afterwards, contact us and we&rsquo;ll try to help you resolve it with the vendor.
            </p>
          </Section>

          <Section number="8" title="Cancellations">
            <p>
              You can cancel an order at any time before paying for it. Once you&rsquo;ve paid, contact SWK Ghana
              as soon as possible: if the vendor hasn&rsquo;t dispatched the order yet, we&rsquo;ll cancel it and
              refund you.
            </p>
          </Section>

          <Section number="9" title="Reviews">
            <p>
              Only buyers who have completed and confirmed delivery of an order may review the product.
              Reviews must be honest and respectful. SWK Ghana may remove reviews that are fraudulent,
              abusive, or unrelated to the product.
            </p>
          </Section>

          <Section number="10" title="Accounts">
            <p>
              You are responsible for the accuracy of your account information and the security of your
              password. SWK Ghana may suspend accounts involved in fraud, misrepresentation,
              greenwashing, or abuse of the platform.
            </p>
          </Section>

          <Section number="11" title="Liability">
            <p>
              SWK Ghana acts as a trusted intermediary between buyers and vendors. While we verify
              vendors and curate listings, products are produced and fulfilled by independent
              entrepreneurs. SWK Ghana&rsquo;s liability for any transaction is limited to the amount
              paid for the relevant order.
            </p>
          </Section>

          <Section number="12" title="Changes to these terms">
            <p>
              We may update these terms from time to time. Material changes will be announced on the
              platform. Continued use of SWK Marketplace after changes take effect constitutes
              acceptance of the updated terms.
            </p>
          </Section>

          <Section number="13" title="Contact">
            <p>
              Questions about these terms? Contact SWK Ghana at{' '}
              <a href="mailto:info@swkghana.org" className="text-green-700 underline underline-offset-2">
                info@swkghana.org
              </a>{' '}
              · Accra, Greater Accra Region, Ghana.
            </p>
            <p>
              See also our{' '}
              <Link href="/privacy" className="text-green-700 underline underline-offset-2">
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
