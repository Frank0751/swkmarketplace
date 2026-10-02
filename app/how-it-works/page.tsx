import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { SectionHeading } from '@/components/marketplace/SectionHeading'
import { DELIVERY_FEE_GHS } from '@/lib/marketplace/orders'
import { formatCurrency } from '@/lib/utils'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'How SWK Marketplace connects buyers with verified youth-led green businesses across Ghana: one cart, escrow-protected payment, SDG 12 checked listings and fair payouts.',
  openGraph: {
    title: 'How SWK Marketplace works',
    description:
      'Escrow-protected payments, SDG 12 checked products, and fair payouts to Ghana\'s young green entrepreneurs.',
    url: 'https://marketplace.swkghana.org/how-it-works',
    siteName: 'SWK Marketplace',
  },
}

// ─── Content ──────────────────────────────────────────────────────────────────

const FACTS = [
  { value: 'SDG 12', label: 'Every listing checked' },
  { value: 'Escrow', label: 'On every order' },
  { value: 'Youth-led', label: 'Every shop' },
  { value: '16 regions', label: 'Delivery across Ghana' },
]

const BUYER_STEPS = [
  {
    title: 'Browse and discover',
    body: 'Explore agribusiness goods, organic produce, recycled and upcycled products and handmade crafts. Filter by the values you care about: zero waste, organic, women-led and more.',
  },
  {
    title: 'Add to cart and pay once',
    body: 'Fill one cart from as many shops as you like and pay in a single checkout, by card or mobile money (MTN MoMo, Telecel Cash, AT Money). Save your address and payment method for next time.',
  },
  {
    title: 'Each shop delivers',
    body: 'Every shop confirms your order, calls you to arrange delivery and sends it out. You get an email at each stage and can follow every order from your account.',
  },
  {
    title: 'Confirm delivery',
    body: 'When your order arrives as described, confirm it. Only then is the shop paid. If something is wrong, report a problem instead and SWK Ghana steps in.',
  },
]

const PROTECTIONS = [
  { title: 'Escrow protection', body: 'Your money is released only when you confirm delivery.' },
  { title: 'SDG 12 checked', body: 'Every product is reviewed for responsible production before it goes live.' },
  { title: 'Genuine reviews', body: 'Only buyers with a delivered order can review a product.' },
  { title: 'Problem resolution', body: 'Report a problem and SWK Ghana mediates, with a refund where it’s due.' },
]

const VENDOR_STEPS = [
  {
    title: 'Apply to sell',
    body: 'Tell us about your business, your sustainability practices and how you align with SDG 12. The SWK Ghana team reviews every application within 2 to 3 business days.',
  },
  {
    title: 'Get approved',
    body: 'Once approved, you can create listings. Each one gets a quick review for quality and SDG 12 alignment before it goes live.',
  },
  {
    title: 'Fulfil orders',
    body: 'You’re emailed when a buyer pays. Confirm the order, call the buyer, dispatch it and update its status from your dashboard.',
  },
  {
    title: 'Receive your payout',
    body: 'When the buyer confirms delivery, SWK Ghana releases 85% of the sale to your mobile money or bank account.',
  },
  {
    title: 'Build your reputation',
    body: 'Verified buyers review your products, and your shop page tells your sustainability story to every visitor.',
  },
  {
    title: 'Grow across Ghana',
    body: 'Reach buyers in all 16 regions. SWK Ghana promotes its vendors through social media, events and partner networks.',
  },
]

const ESCROW_STEPS = [
  { title: 'Buyer pays', body: 'The payment goes to SWK Ghana, not straight to the shop.' },
  { title: 'Funds held', body: 'The money waits safely while the shop prepares and delivers the order.' },
  { title: 'Buyer confirms', body: 'The buyer confirms the order arrived as described.' },
  { title: 'Shop paid', body: 'SWK Ghana releases 85% of the payment to the shop’s account.' },
]

const SDG_CRITERIA = [
  'Products use sustainable, natural or recycled materials',
  'Businesses operate with environmentally responsible practices',
  'Packaging is minimal, biodegradable or reusable where possible',
  'Businesses support local ecosystems and livelihoods',
]

const CATEGORIES = [
  { label: 'Agribusiness', body: 'Sustainably grown crops and farm produce', href: '/marketplace?category=agribusiness' },
  { label: 'Organic produce', body: 'Chemical-free fruit, vegetables and oils', href: '/marketplace?category=organic_produce' },
  { label: 'Recycled & upcycled', body: 'Everyday goods from reclaimed materials', href: '/marketplace?category=recycled_upcycled' },
  { label: 'Handmade crafts', body: 'Artisan pieces from natural materials', href: '/marketplace?category=handmade_crafts' },
]

const FAQS = [
  {
    q: 'Is SWK Marketplace only for buyers in Ghana?',
    a: `For now, SWK Marketplace delivers within Ghana, to all 16 regions. Delivery is a flat ${formatCurrency(DELIVERY_FEE_GHS)} per shop in your cart, however many of that shop's products you buy, and it's shown before you pay. Each shop arranges its own delivery and calls the phone number you give at checkout.`,
  },
  {
    q: 'How do I know my payment is safe?',
    a: 'Your money is held in escrow by SWK Ghana and released only after you confirm your order arrived. Real payments are processed by Paystack, one of Africa’s most trusted payment providers. If there’s a problem, report it from your order page and we mediate. You’re never left without recourse.',
  },
  {
    q: 'What are the sample shops?',
    a: 'While our first verified vendors join, the marketplace shows four sample shops so you can try everything: add products to your cart, check out, save a card or mobile money number, and follow your order to delivery. Sample products are marked “Sample”, and their checkout uses a test payment, so no real money is ever taken. Use one of the test cards shown at checkout, or approve the on-screen mobile money prompt.',
  },
  {
    q: 'What happens if I’m not happy with my order?',
    a: 'If your order doesn’t arrive, arrives damaged, or is very different from the description, don’t confirm delivery. Press “Report a problem” on your order page instead. Your payment stays on hold while SWK Ghana investigates and, where appropriate, issues a full refund.',
  },
  {
    q: 'How long does delivery take?',
    a: 'It depends on where the shop is and where you are. Most shops dispatch within 1 to 3 business days of confirming your order. You’ll get an email when it’s on its way, and you can follow it from your account.',
  },
  {
    q: 'Can I sell on SWK Marketplace?',
    a: 'Yes, if you run a sustainable business in Ghana. Apply from “Become a vendor”. Our team reviews every application within 2 to 3 business days against SDG 12. There’s no monthly fee: SWK Ghana takes 15% only when you make a sale.',
  },
  {
    q: 'What is the 15% platform commission?',
    a: 'When a sale completes, SWK Ghana keeps 15% of the order total. It covers payment processing, the platform, vendor support and SDG 12 verification, and is reinvested in youth enterprise. The other 85% goes to the vendor’s mobile money or bank account after delivery is confirmed.',
  },
]

// ─── Building blocks ──────────────────────────────────────────────────────────

function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex-shrink-0 w-11 h-11 rounded-full border-2 border-green-600 bg-white text-green-700 font-mono font-bold text-sm flex items-center justify-center"
    >
      {String(n).padStart(2, '0')}
    </span>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-sand-200 bg-white open:border-green-600 transition-colors">
      <summary className="flex items-center justify-between gap-4 px-5 min-h-[60px] cursor-pointer select-none list-none rounded-xl hover:bg-sand-50 transition-colors">
        <span className="text-base font-semibold text-sand-900">{question}</span>
        <ChevronDown className="w-5 h-5 text-sand-600 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p className="px-5 pb-5 text-[15px] text-sand-700 leading-relaxed">{answer}</p>
    </details>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main id="main">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="bg-sand-50 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="container-app">
            <div className="max-w-3xl">
              <p className="eyebrow rise rise-1 mb-5">How it works</p>
              <h1 className="rise rise-2 font-bold text-sand-900 text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[1.05] tracking-[-0.025em] text-balance">
                Buying and selling, <span className="text-green-600">made safe for everyone</span>
              </h1>
              <span className="rule rise rise-3 mt-6 mb-6" aria-hidden="true" />
              <p className="rise rise-3 text-lg md:text-xl text-sand-700 leading-relaxed max-w-2xl">
                SWK Marketplace connects buyers with verified youth-led green businesses across Ghana. Every
                payment is held by SWK Ghana until the order arrives, so buyers and shops can trust each other.
              </p>
              <div className="rise rise-4 mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
                >
                  Start shopping <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/vendor/apply"
                  className="inline-flex items-center justify-center min-h-[52px] px-7 rounded-xl border-2 border-green-600 text-green-700 text-sm font-bold hover:bg-green-50 transition-colors"
                >
                  Become a vendor
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Facts ────────────────────────────────────────────────── */}
        <section aria-label="Key facts" className="bg-green-900 text-white">
          <dl className="container-app grid grid-cols-2 md:grid-cols-4">
            {FACTS.map((fact, i) => (
              <div
                key={fact.label}
                className={`flex flex-col px-4 sm:px-6 py-7 border-white/10 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}
              >
                <dt className="order-2 mt-1 text-sm text-green-100">{fact.label}</dt>
                <dd className="order-1 text-2xl md:text-3xl font-bold tracking-tight">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── For buyers ───────────────────────────────────────────── */}
        <section className="section bg-white">
          <div className="container-app grid lg:grid-cols-[1.2fr,0.8fr] gap-12 lg:gap-16 items-start">
            <div>
              <SectionHeading
                eyebrow="For buyers"
                title={<>Shop sustainably, <span className="text-green-600">with confidence</span></>}
                subtitle="Every product is checked against SDG 12 before it goes live, and your payment is held until you confirm delivery."
              />
              <ol className="mt-10 space-y-8">
                {BUYER_STEPS.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5">
                    {i < BUYER_STEPS.length - 1 && (
                      <span className="absolute left-[21px] top-12 -bottom-8 w-0.5 bg-sand-200" aria-hidden="true" />
                    )}
                    <StepNumber n={i + 1} />
                    <div className="pt-1.5">
                      <h3 className="text-lg font-bold text-sand-900">{step.title}</h3>
                      <p className="mt-1.5 text-[15px] text-sand-700 leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="lg:sticky lg:top-24 space-y-5">
              <div className="rounded-2xl border border-sand-200 bg-sand-50 p-6">
                <h3 className="eyebrow mb-4">Your protections</h3>
                <ul className="space-y-4">
                  {PROTECTIONS.map(p => (
                    <li key={p.title} className="flex gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-bold text-sand-900">{p.title}</span>
                        <span className="block text-sm text-sand-700 mt-0.5">{p.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="rounded-2xl bg-green-900 p-6 text-sm leading-relaxed text-green-50">
                <strong className="block text-white text-base mb-1">Where your money goes</strong>
                85% of every sale goes to the young entrepreneur who made it. The other 15% is reinvested in
                training and growing youth-led businesses.
              </p>
            </aside>
          </div>
        </section>

        {/* ── Escrow ───────────────────────────────────────────────── */}
        <section className="section bg-sand-100">
          <div className="container-app">
            <SectionHeading
              eyebrow="Escrow"
              title="How escrow protects everyone"
              subtitle="SWK Ghana acts as a neutral third party: it holds each payment until the order is complete, so buyers never pay for goods that don’t arrive and shops never ship for nothing."
            />
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {ESCROW_STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  {i < ESCROW_STEPS.length - 1 && (
                    <span className="hidden md:block absolute top-[21px] left-11 -right-8 h-0.5 bg-green-600/30" aria-hidden="true" />
                  )}
                  <StepNumber n={i + 1} />
                  <h3 className="mt-5 text-lg font-bold text-sand-900">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] text-sand-700 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-sm text-sand-700">
              If a problem is reported, SWK Ghana mediates and can refund the buyer. Money is never stuck.
            </p>
          </div>
        </section>

        {/* ── For vendors ──────────────────────────────────────────── */}
        <section className="section bg-white">
          <div className="container-app">
            <SectionHeading
              eyebrow="For vendors"
              title={<>Sell to buyers who <span className="text-green-600">care how it’s made</span></>}
              subtitle="Join a marketplace built for Ghana’s young green entrepreneurs. Reach buyers across the country, get paid securely, and grow your business."
            />
            <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {VENDOR_STEPS.map((step, i) => (
                <li key={step.title} className="card-accent rounded-2xl border border-sand-200 bg-white p-6 hover:border-green-300 hover:shadow-card-md transition-all">
                  <span className="font-mono text-xs font-bold text-gold-600" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-sand-900">{step.title}</h3>
                  <p className="mt-2 text-[15px] text-sand-700 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>

            <figure className="mt-12 max-w-2xl rounded-2xl bg-sand-50 border border-sand-200 p-6 sm:p-8">
              <figcaption>
                <span className="eyebrow">Platform fee</span>
                <span className="block mt-2 text-2xl font-bold text-sand-900">15% per sale, nothing else</span>
                <span className="block mt-2 text-[15px] text-sand-700 leading-relaxed">
                  No listing or monthly fees. The commission covers payment processing, the platform, vendor
                  support and SDG 12 verification.
                </span>
              </figcaption>
              <div
                className="mt-6 flex h-12 rounded-xl overflow-hidden"
                role="img"
                aria-label="Of every 100 cedis: 85 to the vendor, 15 to SWK Ghana"
              >
                <div className="flex items-center justify-center bg-green-600 text-white text-sm font-bold" style={{ width: '85%' }}>
                  85% to the vendor
                </div>
                <div className="flex items-center justify-center bg-gold-400 text-white text-sm font-bold" style={{ width: '15%' }}>
                  15%
                </div>
              </div>
            </figure>
          </div>
        </section>

        {/* ── SDG 12 ───────────────────────────────────────────────── */}
        <section className="section bg-sand-50">
          <div className="container-app grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeading
                eyebrow="SDG 12 alignment"
                title="Why every product is SDG 12 checked"
                subtitle="SDG 12, Responsible Consumption and Production, is at the core of SWK Marketplace. The SWK Ghana team reviews every vendor and every listing against it before approval."
              />
              <ul className="mt-8 space-y-3">
                {SDG_CRITERIA.map(point => (
                  <li key={point} className="flex gap-3 text-[15px] text-sand-800">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES.map(c => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    className="card-accent block h-full rounded-2xl border border-sand-200 bg-white p-5 hover:border-green-300 hover:shadow-card-md transition-all"
                  >
                    <span className="block text-base font-bold text-sand-900">{c.label}</span>
                    <span className="block mt-1 text-sm text-sand-700">{c.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="section bg-white">
          <div className="container-app max-w-3xl">
            <SectionHeading eyebrow="Questions" title="Frequently asked questions" align="center" />
            <div className="mt-10 space-y-3">
              {FAQS.map(item => <FAQItem key={item.q} question={item.q} answer={item.a} />)}
            </div>
            <p className="mt-8 text-center text-sm text-sand-700">
              Still have questions?{' '}
              <a href="mailto:info@swkghana.org" className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2">
                Email info@swkghana.org
              </a>
            </p>
          </div>
        </section>

        {/* ── Call to action ───────────────────────────────────────── */}
        <section className="section bg-green-900">
          <div className="container-app max-w-2xl text-center">
            <SectionHeading
              eyebrow="Ready when you are"
              title={<>Shop green. <span className="text-green-200">Support youth.</span></>}
              subtitle="Discover eco-friendly products from youth-led businesses across Ghana. Every purchase makes a difference."
              align="center"
              onDark
            />
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[52px] px-7 rounded-xl bg-white text-green-800 text-sm font-bold hover:bg-green-50 transition-colors"
              >
                Shop now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/vendor/apply"
                className="inline-flex items-center justify-center w-full sm:w-auto min-h-[52px] px-7 rounded-xl border border-white/40 text-white text-sm font-semibold hover:border-white hover:bg-white/10 transition-colors"
              >
                Start selling
              </Link>
            </div>
            <p className="mt-6 text-sm text-green-100">
              Already a vendor?{' '}
              <Link href="/login" className="underline underline-offset-2 hover:text-white">
                Sign in to your dashboard
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
