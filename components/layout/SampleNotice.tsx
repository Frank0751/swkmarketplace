import Link from 'next/link'
import { sampleCatalogueVisible } from '@/lib/marketplace/catalogue'

/**
 * One plain line across the top while SWK's sample shops are on show, so nobody
 * mistakes them for real listings. It disappears when an admin hides them.
 */
export async function SampleNotice() {
  if (!(await sampleCatalogueVisible())) return null

  return (
    <div className="bg-green-900 text-green-50">
      <p className="container-app py-2 text-xs sm:text-[13px] leading-snug">
        <strong className="font-bold text-white">Preview.</strong>{' '}
        The shops here are samples. You can check out with a test payment and no money is taken.{' '}
        <Link href="/how-it-works#samples" className="underline underline-offset-2 hover:text-white">
          What this means
        </Link>
      </p>
    </div>
  )
}
