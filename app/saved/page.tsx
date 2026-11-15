import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { SavedList } from '@/components/saved/SavedList'

export const metadata: Metadata = {
  title: 'Saved items',
  robots: { index: false, follow: true },
}

export default function SavedPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="container-app py-8 md:py-12 pb-24 md:pb-16">
        <h1 className="title-page">Saved items</h1>
        <span className="rule mt-4" aria-hidden="true" />
        <p className="mt-4 text-base text-sand-700">
          Kept on this device. No account needed.
        </p>
        <SavedList className="mt-8" />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
