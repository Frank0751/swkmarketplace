import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { SampleNotice } from '@/components/layout/SampleNotice'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { EscrowTrack } from '@/components/escrow/EscrowTrack'
import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How buying and selling work on SWK Marketplace: one cart, a payment held by SWK Ghana until your order arrives, and listings checked against SDG 12.',
  openGraph: {
    title: 'How SWK Marketplace works',
    description: 'Your payment is held by SWK Ghana until your order arrives. Every listing is checked against SDG 12.',
    url: 'https://marketplace.swkghana.org/how-it-works',
    siteName: 'SWK Marketplace',
  },
}

// ─── Content ──────────────────────────────────────────────────────────────────

const PROTECTIONS = [
  { title: 'Checked before sale', body: 'Every shop and every listing is reviewed for responsible production before it goes on sale.' },
  { title: 'Real reviews', body: 'Only buyers with a delivered order can review a product.' },
  { title: 'Help with problems', body: 'Report a problem and SWK Ghana steps in, with a refund where it’s due.' },
]

const VENDOR_STEPS = [
  { title: 'Apply', body: 'Tell us about your business and how it makes things responsibly. The SWK Ghana team replies within 2 to 3 working days.' },
  { title: 'List your products', body: 'Once approved, add your products. Each listing is checked before it goes on sale.' },
  { title: 'Fulfil orders', body: 'You’re emailed when a buyer pays. Confirm the order, call the buyer, send it and mark it sent.' },
  { title: 'Get paid', body: 'When the buyer confirms delivery, SWK Ghana pays 85% of the sale to your mobile money or bank account.' },
  { title: 'Build your name', body: 'Buyers review what they bought, and your shop page tells your story to every visitor.' },
]

const SDG_CRITERIA = [
  'Products use sustainable, natural or recycled materials',
  'The business works in environmentally responsible ways',
  'Packaging is minimal, biodegradable or reusable where possible',
  'The business supports local ecosystems and livelihoods',
]

const FAQS = [
  {
    q: 'Do you deliver outside Ghana?',
    a: `Not yet. Shops deliver anywhere in Ghana. Delivery is ${formatCurrency(DELIVERY_FEE_GHS)} per shop in your cart, however many of that shop's products you buy, and it's shown before you pay. Each shop arranges its own delivery and calls the phone number you give at checkout.`,
  },
  {
    q: 'How do I know my payment is safe?',
    a: 'Your money goes to SWK Ghana, not to the shop, and is released only after you confirm your order arrived. Real payments are processed by Paystack. If there’s a problem, report it from your order page and we step in.',
  },
  {
    q: 'What if I’m not happy with my order?',
    a: 'If it doesn’t arrive, arrives damaged, or is very different from the description, don’t confirm delivery. Press “Report a problem” on your order page instead. Your payment stays on hold while SWK Ghana looks into it and, where it’s due, refunds you in full.',
  },
  {
    q: 'How long does delivery take?',
    a: 'It depends on where the shop is and where you are. Most shops send orders within 1 to 3 working days of confirming them. You’ll get an email when your order is on its way, and you can follow it from your account.',
  },
  {
    q: 'Can I sell on SWK Marketplace?',
    a: 'Yes, if you are young and run a green business in Ghana. Apply from “Sell on SWK Marketplace”. There’s no monthly fee: SWK Ghana keeps 15% only when you make a sale.',
  },
  {
    q: 'What does the 15% pay for?',
    a: 'When a sale completes, SWK Ghana keeps 15% of the order total. It covers payment processing, the platform, support for shops and SDG 12 checks, and funds SWK Ghana’s youth programmes. The other 85% goes to the shop after delivery is confirmed.',
  },
]

const SECTIONS = [
  { id: 'buying', label: 'Buying' },
  { id: 'samples', label: 'The sample shops' },
  { id: 'selling', label: 'Selling' },
  { id: 'sdg-12', label: 'SDG 12' },
  { id: 'questions', label: 'Questions' },
]

// ─── Building blocks ──────────────────────────────────────────────────────────

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-sand-200">
      <summary className="flex items-center justify-between gap-4 min-h-[60px] py-3 cursor-pointer select-none list-none">
        <span className="text-base font-bold text-sand-900">{question}</span>
        <ChevronDown className="w-5 h-5 text-sand-600 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="pb-5 text-[15px] text-sand-700 leading-relaxed max-w-prose">{answer}</p>
    </details>
  )
}

function Block({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 py-12 md:py-16 border-t border-sand-200">
      <h2 id={`${id}-title`} className="title-section">{title}</h2>
      {intro && <p className="mt-3 text-base text-sand-700 leading-relaxed max-w-2xl">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <>
      <SampleNotice />
      <Navbar />

      <main id="main" className="container-app pt-10 md:pt-14 pb-24 md:pb-16">
        <header className="max-w-3xl pb-10">
          <h1 className="title-page">How it works</h1>
          <span className="rule mt-4" aria-hidden="true" />
          <p className="mt-4 text-lg text-sand-700 leading-relaxed">
            SWK Marketplace is run by SWK Ghana, a youth nonprofit. Young people in Ghana sell what they grow,
            make and upcycle. Every payment goes to SWK Ghana first and reaches the shop only once the order
            has arrived.
          </p>
          <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="link inline-flex items-center min-h-[40px]">{s.label}</a>
            ))}
          </nav>
        </header>

        <Block
          id="buying"
          title="Buying"
          intro="Fill one cart from as many shops as you like and pay once, by mobile money (MTN MoMo, Telecel Cash, AT Money) or card. This is where your money is at each step."
        >
          <EscrowTrack />
          <div className="mt-12 grid sm:grid-cols-3 gap-x-8 gap-y-5 max-w-4xl">
            {PROTECTIONS.map(p => (
              <div key={p.title}>
                <h3 className="text-base font-bold text-sand-900 tracking-normal">{p.title}</h3>
                <p className="mt-1 text-sm text-sand-700 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-sand-700">
            Delivery is {formatCurrency(DELIVERY_FEE_GHS)} per shop in your cart, anywhere in Ghana.{' '}
            <Link href="/marketplace" className="link">Start shopping</Link>
          </p>
        </Block>

        <Block
          id="samples"
          title="The sample shops"
          intro="While the first real shops are being checked, the marketplace shows four sample shops so you can try everything."
        >
          <ul className="space-y-2 text-[15px] text-sand-800 max-w-2xl list-disc pl-5 marker:text-gold-400">
            <li>Sample products are marked &ldquo;Sample&rdquo;.</li>
            <li>Their checkout uses a test payment. No real money is ever taken.</li>
            <li>Pay with one of the test cards shown at checkout, or approve the mobile money prompt on screen.</li>
            <li>On a sample order you can play the shop yourself: confirm it, send it, then confirm delivery.</li>
          </ul>
        </Block>

        <Block
          id="selling"
          title="Selling"
          intro="For young people in Ghana who run a green business. Joining is free and there is nothing to pay until you sell."
        >
          <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
            {VENDOR_STEPS.map((step, i) => (
              <li key={step.title}>
                <h3 className="text-base font-bold text-sand-900 tracking-normal">
                  <span className="text-sand-600 font-medium mr-1.5">{i + 1}.</span>{step.title}
                </h3>
                <p className="mt-1 text-sm text-sand-700 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>

          <figure className="mt-10 max-w-xl">
            <figcaption className="text-sm font-bold text-sand-900 mb-3">Where a GHS 100 sale goes</figcaption>
            <div className="flex h-12 rounded-lg overflow-hidden text-sm font-bold" role="img" aria-label="Of every 100 cedis: 85 to the shop, 15 to SWK Ghana">
              <div className="flex items-center px-4 bg-green-600 text-white" style={{ width: '85%' }}>GHS 85 to the shop</div>
              <div className="flex items-center justify-center bg-gold-400 text-white" style={{ width: '15%' }}>15</div>
            </div>
            <p className="mt-3 text-sm text-sand-700 leading-relaxed">
              The 15 covers payment processing, the platform, support for shops and SDG 12 checks, and funds
              SWK Ghana&rsquo;s youth programmes. No listing or monthly fees.
            </p>
          </figure>

          <Link href="/vendor/apply" className="btn btn-primary mt-8">Apply to sell</Link>
        </Block>

        <Block
          id="sdg-12"
          title="Why every listing is checked against SDG 12"
          intro="SDG 12 is the UN goal for responsible consumption and production. SWK Ghana reviews every shop and every listing against it before it goes on sale."
        >
          <ul className="space-y-2 text-[15px] text-sand-800 max-w-2xl list-disc pl-5 marker:text-gold-400">
            {SDG_CRITERIA.map(point => <li key={point}>{point}</li>)}
          </ul>
        </Block>

        <Block id="questions" title="Questions">
          <div className="max-w-3xl border-t border-sand-200">
            {FAQS.map(item => <FAQItem key={item.q} question={item.q} answer={item.a} />)}
          </div>
          <p className="mt-8 text-sm text-sand-700">
            Something else? <Link href="/contact" className="link">Contact the SWK Ghana team</Link>.
          </p>
        </Block>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
