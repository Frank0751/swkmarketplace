import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem, DrawLine } from '@/components/ui/motion'
import { SectionHeading } from '@/components/marketplace/SectionHeading'

// How buying works, told as the escrow it rests on. Replaces two home-page
// sections (an escrow infographic and a separate "how it works") that said the
// same thing twice.
const STEPS = [
  {
    title: 'Fill your cart',
    body: 'Add products from as many youth-led shops as you like, then check out once.',
  },
  {
    title: 'Pay by MoMo or card',
    body: 'SWK Ghana holds your payment in escrow. The shop isn’t paid yet.',
  },
  {
    title: 'The shop delivers',
    body: 'Each shop calls you to arrange delivery, anywhere in Ghana.',
  },
  {
    title: 'You confirm, the shop is paid',
    body: 'Confirm delivery from your account. Only then is the shop’s share released.',
  },
]

export function TrustSection() {
  return (
    <section className="section bg-sand-100">
      <div className="container-app">
        <FadeIn>
          <SectionHeading
            eyebrow="How buying works"
            title={<>Your money waits <span className="text-green-600">until your order arrives</span></>}
            subtitle="Every payment is held by SWK Ghana, a youth nonprofit, and released to the shop only when you say your order arrived as described."
          />
        </FadeIn>

        <div className="relative mt-12 md:mt-14">
          <Stagger className="relative grid gap-8 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, i) => (
              <StaggerItem key={step.title} className="relative flex lg:block gap-5">
                {/* Each step joins the next: across on desktop (drawn as it
                    scrolls in), down on phones */}
                {i < STEPS.length - 1 && (
                  <>
                    <span className="hidden lg:block absolute top-[21px] left-11 -right-8 h-0.5 bg-sand-300" aria-hidden="true">
                      <DrawLine className="h-full w-full bg-green-600" />
                    </span>
                    <span className="lg:hidden absolute left-[21px] top-11 -bottom-8 w-0.5 bg-sand-300" aria-hidden="true" />
                  </>
                )}
                <span className="relative z-10 flex-shrink-0 w-11 h-11 rounded-full bg-white border-2 border-green-600 text-green-700 font-mono font-bold text-sm flex items-center justify-center">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="lg:mt-6 pb-1">
                  <h3 className="text-lg font-bold text-sand-900 leading-snug">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-sand-700 max-w-xs">{step.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Why it matters */}
        <FadeIn className="mt-16 md:mt-20">
          <div className="grid lg:grid-cols-2 overflow-hidden rounded-3xl bg-green-900">
            <div className="relative min-h-[240px] lg:min-h-[380px]">
              <Image
                src="/images/impact-seedling.jpg"
                alt="A seedling growing in a young entrepreneur's nursery"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <p className="eyebrow eyebrow-on-dark mb-3">Why it matters</p>
              <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight text-balance">
                Every purchase powers youth-led green enterprise
              </h3>
              <span className="rule mt-4" aria-hidden="true" />
              <p className="mt-4 text-base leading-relaxed text-green-50/90 max-w-lg">
                SWK Marketplace is run by SWK Ghana, a youth-focused nonprofit. The platform’s 15%
                commission goes back into training, onboarding and growing young entrepreneurs across
                Ghana and Africa.
              </p>
              <Link
                href="https://swkghana.org"
                className="mt-7 inline-flex items-center gap-2 self-start min-h-[44px] text-sm font-semibold text-green-100 hover:text-white transition-colors group"
              >
                About SWK Ghana
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
