import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { FadeIn } from '@/components/ui/motion'
import { SectionHeading } from '@/components/marketplace/SectionHeading'

export function VendorCTA() {
  return (
    <section className="section relative overflow-hidden bg-green-900">
      {/* Young entrepreneurs at work, kept dim so the text stays legible */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image src="/images/vendor-cta.jpg" alt="" fill sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/80 via-green-900/70 to-green-900" />
      </div>

      <div className="container-app relative">
        <FadeIn className="max-w-3xl mx-auto text-center">
          <SectionHeading
            eyebrow="For young green entrepreneurs"
            title={<>Sell to buyers who <span className="text-green-200">care how it’s made</span></>}
            subtitle="SWK Marketplace is run by SWK Ghana, a youth nonprofit whose programmes have reached 236+ young people across 9 countries. Get escrow-protected sales, your own shareable shop page, and buyers looking for products like yours."
            align="center"
            onDark
          />

          {/* Where every sale goes */}
          <figure className="max-w-xl mx-auto mt-10 text-left">
            <figcaption className="eyebrow eyebrow-on-dark text-center mb-3">Where every GHS 100 sale goes</figcaption>
            <div
              className="flex h-14 rounded-xl overflow-hidden"
              role="img"
              aria-label="Commission split: 85 cedis to the vendor, 15 cedis reinvested in youth programmes"
            >
              <div className="flex items-center justify-center gap-2 bg-white text-green-900" style={{ width: '85%' }}>
                <span className="text-lg font-bold">GHS 85</span>
                <span className="text-xs font-medium text-sand-700 hidden sm:inline">to you, the vendor</span>
              </div>
              <div className="flex items-center justify-center bg-gold-400 text-white" style={{ width: '15%' }}>
                <span className="text-sm font-bold">15</span>
              </div>
            </div>
            <div className="flex justify-between gap-4 mt-2 text-xs text-green-100">
              <span>Paid straight to your MoMo or bank</span>
              <span className="text-right">Reinvested in youth programmes</span>
            </div>
          </figure>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/vendor/apply"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[52px] px-7 bg-white text-green-800 text-sm font-bold rounded-xl hover:bg-green-50 transition-colors group"
            >
              Apply to become a vendor
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center w-full sm:w-auto min-h-[52px] px-7 text-white text-sm font-semibold rounded-xl border border-white/40 hover:border-white hover:bg-white/10 transition-colors"
            >
              How selling works
            </Link>
          </div>

          <p className="mt-6 text-xs text-green-100/80">
            Free to apply · Reviewed by SWK Ghana · Commission only on completed sales
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
