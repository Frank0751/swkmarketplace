import type { Metadata } from 'next'
import { Ubuntu } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Brand font: Ubuntu everywhere (body + display)
const bodyFont = Ubuntu({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
})

const displayFont = Ubuntu({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: {
    default: 'SWK Marketplace: Ghana\'s Sustainable Youth Marketplace',
    template: '%s | SWK Marketplace',
  },
  description:
    'A curated, SDG 12-aligned marketplace connecting eco-conscious buyers with verified green entrepreneurs across Ghana and Africa.',
  keywords: ['sustainable', 'Ghana', 'marketplace', 'eco-friendly', 'youth', 'SDG', 'green', 'organic', 'handmade'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://marketplace.swkghana.org'),
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: 'https://marketplace.swkghana.org',
    siteName: 'SWK Marketplace',
    title: 'SWK Marketplace: Ghana\'s Sustainable Youth Marketplace',
    description: 'Shop verified eco-friendly products from youth-led green entrepreneurs across Ghana.',
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SWK Marketplace',
    description: 'Ghana\'s curated sustainable marketplace.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-sand-50 font-sans antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#2A2823',
              border: '1px solid #E8E4D8',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.08)',
            },
            success: {
              iconTheme: { primary: '#3B6D11', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
