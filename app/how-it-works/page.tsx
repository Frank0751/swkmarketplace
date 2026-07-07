import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Star,
  Leaf,
  Store,
  ClipboardList,
  PackageCheck,
  Banknote,
  ChevronDown,
  ArrowRight,
  Globe,
  Users,
  BadgeCheck,
} from 'lucide-react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'How it works, SWK Marketplace',
  description:
    'Learn how SWK Marketplace connects eco-conscious buyers with verified youth-led green entrepreneurs across Ghana. Secure escrow payments, SDG 12 verification, and fair payouts.',
  openGraph: {
    title: 'How SWK Marketplace works',
    description:
      'Secure escrow payments, SDG 12-verified products, and fair payouts to Ghana\'s youth green entrepreneurs.',
    url: 'https://marketplace.swkghana.org/how-it-works',
    siteName: 'SWK Marketplace',
  },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface StepCardProps {
  step: number
  icon: React.ReactNode
  title: string
  description: string
  accent?: 'green' | 'teal' | 'gold'
}

function StepCard({ step, icon, title, description, accent = 'green' }: StepCardProps) {
  const accentClasses = {
    green: 'bg-green-600 text-white',
    teal: 'bg-teal-600 text-white',
    gold: 'bg-gold-400 text-white',
  }

  return (
    <div className="relative flex gap-5">
      {/* Step circle */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-card ${accentClasses[accent]}`}
        >
          {step}
        </div>
        {/* Connector line, hidden on last item (handled via CSS in list) */}
        <div className="flex-1 w-0.5 bg-sand-200 my-2 min-h-8" />
      </div>

      {/* Content */}
      <div className="pb-8 flex-1">
        <div className="flex items-start gap-3 mb-2">
          <div className="mt-0.5 text-green-600">{icon}</div>
          <h3 className="text-base font-semibold text-sand-900 leading-snug">{title}</h3>
        </div>
        <p className="text-sm text-sand-500 leading-relaxed ml-7">{description}</p>
      </div>
    </div>
  )
}

// ─── FAQ accordion (pure CSS, no JS needed) ────────────────────────────────────

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border border-sand-200 rounded-xl overflow-hidden bg-white">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none hover:bg-sand-50 transition-colors">
        <span className="text-sm font-semibold text-sand-900 pr-4">{question}</span>
        <ChevronDown className="w-4 h-4 text-sand-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pt-1">
        <p className="text-sm text-sand-500 leading-relaxed">{answer}</p>
      </div>
    </details>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-green-600 py-20 md:py-28">
          {/* Decorative dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden="true"
          />

          <div className="container-app relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-green-100 text-xs font-medium mb-6">
              <Leaf className="w-3.5 h-3.5" />
              SDG 12 Verified Marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-5 text-balance leading-tight">
              How SWK Marketplace<br className="hidden sm:block" /> works
            </h1>

            <p className="text-green-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
              We connect eco-conscious buyers with verified youth-led green entrepreneurs across Ghana, safely, transparently, and sustainably.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-green-700 font-semibold text-sm hover:bg-green-50 transition-colors shadow-card"
              >
                <ShoppingBag className="w-4 h-4" />
                Start shopping
              </Link>
              <Link
                href="/vendor/apply"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm hover:bg-green-800 border border-green-500 transition-colors"
              >
                <Store className="w-4 h-4" />
                Become a vendor
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        <section className="bg-white border-b border-sand-200 py-6">
          <div className="container-app">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: <BadgeCheck className="w-5 h-5 text-green-600" />, value: 'SDG 12', label: 'Verified products' },
                { icon: <ShieldCheck className="w-5 h-5 text-teal-600" />, value: 'Escrow', label: 'Secure payments' },
                { icon: <Users className="w-5 h-5 text-gold-400" />, value: 'Youth-led', label: 'Entrepreneurs' },
                { icon: <Globe className="w-5 h-5 text-green-600" />, value: '16 regions', label: 'Across Ghana' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  {icon}
                  <div className="text-lg font-bold text-sand-900">{value}</div>
                  <div className="text-xs text-sand-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── For buyers ────────────────────────────────────────────── */}
        <section className="section bg-sand-50">
          <div className="container-app">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
                  <ShoppingBag className="w-4 h-4" />
                  For buyers
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-sand-900 mb-4 text-balance">
                  Shop sustainably with confidence
                </h2>
                <p className="text-sand-500 text-sm leading-relaxed mb-8">
                  Every product on SWK Marketplace is reviewed for SDG 12 alignment before going live. Your payment is held in escrow and only released after you confirm delivery, you're always protected.
                </p>

                {/* Steps */}
                <div>
                  <StepCard
                    step={1}
                    icon={<ShoppingBag className="w-5 h-5" />}
                    title="Browse & discover"
                    description="Browse hundreds of eco-friendly products across four categories: Agribusiness, Organic Produce, Recycled & Upcycled goods, and Handmade Crafts. Filter by values, zero-waste, organic, women-led, and more."
                  />
                  <StepCard
                    step={2}
                    icon={<ShieldCheck className="w-5 h-5" />}
                    title="Pay securely via Paystack"
                    description="Place your order and pay securely using your card, mobile money, or bank transfer. Your payment goes into escrow, held safely by SWK Ghana, not released to the vendor until delivery is confirmed."
                    accent="teal"
                  />
                  <StepCard
                    step={3}
                    icon={<Truck className="w-5 h-5" />}
                    title="Receive your order"
                    description="The vendor prepares and dispatches your order. You'll receive email updates at every stage. Track your order from your buyer dashboard."
                  />
                  <StepCard
                    step={4}
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    title="Confirm delivery & release payment"
                    description="Once your order arrives and you're happy, confirm delivery in your dashboard. This triggers the release of payment to the vendor. You can raise a dispute if anything is wrong, we're here to help."
                    accent="gold"
                  />
                </div>
              </div>

              {/* Visual panel */}
              <div className="lg:pt-12">
                <div className="rounded-2xl bg-white border border-sand-200 shadow-card p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-sand-700">Your buyer protections</h3>
                  {[
                    {
                      icon: <ShieldCheck className="w-5 h-5 text-teal-600" />,
                      title: 'Escrow protection',
                      desc: 'Money is never released until YOU confirm delivery.',
                    },
                    {
                      icon: <BadgeCheck className="w-5 h-5 text-green-600" />,
                      title: 'SDG 12 verified',
                      desc: 'Every product is screened for sustainability before listing.',
                    },
                    {
                      icon: <Star className="w-5 h-5 text-gold-400" />,
                      title: 'Vendor ratings',
                      desc: 'Real reviews from real buyers, shop with confidence.',
                    },
                    {
                      icon: <ClipboardList className="w-5 h-5 text-green-600" />,
                      title: 'Dispute resolution',
                      desc: 'Raise a dispute if your order has a problem and we\'ll step in.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-3 items-start">
                      <div className="mt-0.5 flex-shrink-0">{icon}</div>
                      <div>
                        <p className="text-sm font-semibold text-sand-900">{title}</p>
                        <p className="text-xs text-sand-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl overflow-hidden bg-green-600 p-6 text-white">
                  <div className="text-xs font-semibold uppercase tracking-widest text-green-200 mb-2">Did you know?</div>
                  <p className="text-sm text-green-100 leading-relaxed">
                    Every purchase on SWK Marketplace directly supports a young Ghanaian green entrepreneur. 85% of your payment goes straight to the vendor, supporting livelihoods and sustainable businesses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── For vendors ───────────────────────────────────────────── */}
        <section className="section bg-white">
          <div className="container-app">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
                <Store className="w-4 h-4" />
                For vendors
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-sand-900 mb-4 text-balance">
                Sell your sustainable products to the world
              </h2>
              <p className="text-sand-500 text-sm max-w-lg mx-auto leading-relaxed">
                Join Ghana's leading sustainable marketplace. Get your products in front of eco-conscious buyers, receive secure payouts, and grow your green business.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[
                {
                  step: 1,
                  icon: <ClipboardList className="w-6 h-6 text-green-600" />,
                  title: 'Apply to become a vendor',
                  description:
                    'Fill out the vendor application with your business details, sustainability statement, and SDG alignment. The SWK Ghana team reviews every application within 2–3 business days.',
                },
                {
                  step: 2,
                  icon: <BadgeCheck className="w-6 h-6 text-teal-600" />,
                  title: 'Get verified & approved',
                  description:
                    'Once approved, you receive your "SDG 12 Verified Vendor" status. You can now create product listings, each one goes through a quick review to ensure quality and alignment.',
                },
                {
                  step: 3,
                  icon: <PackageCheck className="w-6 h-6 text-gold-400" />,
                  title: 'Fulfil orders',
                  description:
                    'When a buyer places an order, you\'ll be notified by email. Confirm the order, prepare the product, dispatch it, and update the status in your vendor dashboard.',
                },
                {
                  step: 4,
                  icon: <Banknote className="w-6 h-6 text-green-600" />,
                  title: 'Receive your payout',
                  description:
                    'After the buyer confirms delivery, the escrow is released. SWK Ghana deducts a 15% platform commission and transfers the remaining 85% directly to your bank account.',
                },
                {
                  step: 5,
                  icon: <Star className="w-6 h-6 text-gold-400" />,
                  title: 'Build your reputation',
                  description:
                    'Collect reviews from verified buyers. Higher-rated vendors get more visibility on the marketplace. Your vendor profile showcases your sustainability story to every buyer.',
                },
                {
                  step: 6,
                  icon: <Globe className="w-6 h-6 text-teal-600" />,
                  title: 'Grow across Ghana & Africa',
                  description:
                    'Your products reach buyers across all 16 regions of Ghana and beyond. SWK Ghana actively promotes vendors through social media, events, and partner networks.',
                },
              ].map(({ step, icon, title, description }) => (
                <div
                  key={step}
                  className="relative bg-sand-50 rounded-xl border border-sand-200 p-6 hover:border-green-200 hover:shadow-card transition-all"
                >
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-sand-200 flex items-center justify-center text-xs font-bold text-sand-500">
                    {step}
                  </div>
                  <div className="mb-3">{icon}</div>
                  <h3 className="text-sm font-semibold text-sand-900 mb-2">{title}</h3>
                  <p className="text-xs text-sand-500 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>

            {/* Commission info */}
            <div className="max-w-2xl mx-auto rounded-2xl border border-green-100 bg-green-50 p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-display font-bold text-sand-900 mb-2">Platform fee: just 15%</h3>
              <p className="text-sm text-sand-600 leading-relaxed mb-4">
                SWK Ghana charges a <strong>15% commission</strong> on each sale, significantly lower than most marketplaces. This fee covers payment processing, platform maintenance, vendor support, and SDG 12 verification services.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">85%</div>
                  <div className="text-xs text-sand-400 mt-0.5">Goes to vendor</div>
                </div>
                <div className="w-px h-10 bg-sand-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-sand-700">15%</div>
                  <div className="text-xs text-sand-400 mt-0.5">SWK platform fee</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Escrow explanation ────────────────────────────────────── */}
        <section className="section bg-teal-600 text-white">
          <div className="container-app">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-5 text-balance">
                How escrow payments protect everyone
              </h2>
              <p className="text-teal-100 text-sm sm:text-base leading-relaxed mb-10 max-w-2xl mx-auto">
                Escrow is a neutral holding mechanism. SWK Ghana acts as a trusted third party that holds your payment safely until the transaction is complete, protecting both buyers and vendors.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                {[
                  {
                    step: '01',
                    label: 'Buyer pays',
                    desc: 'Payment goes to SWK Ghana escrow, not directly to the vendor.',
                    color: 'bg-white/10 border-white/20',
                  },
                  {
                    step: '02',
                    label: 'Funds held',
                    desc: 'Money is secure in escrow while the vendor prepares and dispatches the order.',
                    color: 'bg-white/10 border-white/20',
                  },
                  {
                    step: '03',
                    label: 'Buyer confirms',
                    desc: 'Buyer confirms delivery when the order arrives as expected.',
                    color: 'bg-white/10 border-white/20',
                  },
                  {
                    step: '04',
                    label: 'Payout released',
                    desc: 'SWK Ghana releases 85% of the payment to the vendor\'s account.',
                    color: 'bg-white/15 border-white/30',
                  },
                ].map(({ step, label, desc, color }) => (
                  <div key={step} className={`rounded-xl border ${color} p-4`}>
                    <div className="text-xs font-bold text-teal-200 mb-2">{step}</div>
                    <div className="text-sm font-semibold text-white mb-1.5">{label}</div>
                    <div className="text-xs text-teal-100 leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>

              <p className="text-teal-200 text-xs mt-6">
                If a dispute is raised, SWK Ghana mediates and can issue a refund, funds are never stuck.
              </p>
            </div>
          </div>
        </section>

        {/* ── SDG 12 section ────────────────────────────────────────── */}
        <section className="section bg-sand-50">
          <div className="container-app">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
                    <Leaf className="w-4 h-4" />
                    SDG 12 alignment
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-sand-900 mb-5 text-balance">
                    Why every product is SDG 12 verified
                  </h2>
                  <p className="text-sand-500 text-sm leading-relaxed mb-5">
                    SDG 12, Responsible Consumption and Production, is at the core of everything SWK Marketplace does. We believe commerce can be a force for good on the planet.
                  </p>
                  <p className="text-sand-500 text-sm leading-relaxed mb-5">
                    Every vendor application and product listing is reviewed by the SWK Ghana team against our SDG 12 criteria before being approved. This means buyers can trust that every purchase they make supports sustainable practices.
                  </p>

                  <div className="space-y-3">
                    {[
                      'Products use sustainable, natural, or recycled materials',
                      'Vendors operate with environmentally responsible practices',
                      'Packaging is minimal, biodegradable, or reusable where possible',
                      'Businesses support local ecosystems and livelihoods',
                    ].map(point => (
                      <div key={point} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-sand-600">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SDG categories grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { emoji: '🌾', label: 'Agribusiness', desc: 'Sustainable crops and farm produce' },
                    { emoji: '♻️', label: 'Recycled & Upcycled', desc: 'Products from reclaimed materials' },
                    { emoji: '🖐️', label: 'Handmade Crafts', desc: 'Artisan goods with natural materials' },
                    { emoji: '🥦', label: 'Organic Produce', desc: 'Chemical-free food products' },
                  ].map(({ emoji, label, desc }) => (
                    <div
                      key={label}
                      className="bg-white rounded-xl border border-sand-200 p-4 hover:border-green-200 hover:shadow-card transition-all"
                    >
                      <div className="text-2xl mb-2">{emoji}</div>
                      <div className="text-sm font-semibold text-sand-900 mb-1">{label}</div>
                      <div className="text-xs text-sand-400 leading-relaxed">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section className="section bg-white">
          <div className="container-app max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-sand-900 mb-3 text-balance">
                Frequently asked questions
              </h2>
              <p className="text-sand-400 text-sm">Everything you need to know about SWK Marketplace.</p>
            </div>

            <div className="space-y-3">
              <FAQItem
                question="Is SWK Marketplace only for buyers in Ghana?"
                answer="SWK Marketplace primarily serves buyers and vendors across Ghana, but we welcome buyers from across Africa and beyond. Delivery availability and fees depend on the vendor's region. Check the product listing for delivery options before placing an order."
              />
              <FAQItem
                question="How do I know my payment is safe?"
                answer="All payments go through Paystack, one of Africa's most trusted payment processors. Your money is held in escrow by SWK Ghana and only released after you confirm that your order has arrived. If you have a problem, you can raise a dispute and we'll mediate. You are never at risk of losing money without recourse."
              />
              <FAQItem
                question="Can I sell on SWK Marketplace as a vendor?"
                answer="Yes! If you run a sustainable, eco-friendly business in Ghana or Africa, we'd love to have you. Apply by clicking 'Become a vendor', our team reviews every application within 2–3 business days and checks for alignment with SDG 12. Once approved, you can start listing products immediately. There's no monthly fee, we only take 15% when you make a sale."
              />
              <FAQItem
                question="What happens if I'm not happy with my order?"
                answer="If your order doesn't arrive, arrives damaged, or significantly differs from the product description, don't confirm delivery. Instead, raise a dispute from your buyer dashboard. SWK Ghana will investigate and, where appropriate, issue a full refund. Your payment is always protected until you choose to release it."
              />
              <FAQItem
                question="How long does delivery take?"
                answer="Delivery times depend on the vendor's location and your delivery region. Most vendors dispatch within 1–3 business days of order confirmation. You'll receive an email when your order is dispatched, and can track progress in your buyer dashboard. Estimated delivery dates are shown per listing where the vendor has provided them."
              />
              <FAQItem
                question="What is the 15% platform commission?"
                answer="When a sale is made, SWK Ghana deducts 15% of the total order value as a platform fee. This covers payment processing costs (Paystack fees), platform maintenance, vendor support, SDG verification services, and promotion of vendors. The remaining 85% is transferred directly to the vendor's bank account after delivery confirmation."
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-sand-400 mb-3">Still have questions?</p>
              <a
                href="mailto:info@swkghana.org"
                className="inline-flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 transition-colors"
              >
                Email us at info@swkghana.org
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <section className="section bg-green-600">
          <div className="container-app text-center">
            <div className="max-w-xl mx-auto">
              <div className="text-4xl mb-5" aria-hidden="true">🌿</div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4 text-balance">
                Ready to shop sustainably?
              </h2>
              <p className="text-green-100 text-sm leading-relaxed mb-8">
                Discover hundreds of eco-friendly products from Ghana's best youth-led green entrepreneurs. Every purchase makes a difference.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-green-700 font-semibold text-sm hover:bg-green-50 transition-colors shadow-card"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Shop now
                </Link>
                <Link
                  href="/vendor/apply"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-green-700 text-white font-semibold text-sm border border-green-500 hover:bg-green-800 transition-colors"
                >
                  <Leaf className="w-4 h-4" />
                  Start selling
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-green-300 text-xs mt-6">
                Already a vendor?{' '}
                <Link href="/login" className="underline underline-offset-2 hover:text-white transition-colors">
                  Sign in to your dashboard
                </Link>
              </p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
