import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { demoEnabled, getDemoProductBySlug, isDemoId } from '@/lib/demo/data'
import { formatCurrency } from '@/lib/utils'

const APP_URL = 'https://marketplace.swkghana.org'

type ProductForMeta = {
  id: string
  title: string
  short_description?: string | null
  images?: string[] | null
  price_ghs: number
  vendor?: { business_name?: string } | null
}

async function findProduct(slug: string): Promise<ProductForMeta | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, title, short_description, images, price_ghs, vendor:vendor_profiles(business_name)')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()

  if (data) return data as unknown as ProductForMeta
  return demoEnabled() ? (getDemoProductBySlug(slug) as ProductForMeta | undefined) ?? null : null
}

/**
 * The product page renders in the browser, so link previews (WhatsApp,
 * Facebook, X), which don't run JavaScript, only ever saw the generic site
 * card. This server layout gives each product its own title, price and photo.
 */
export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const product = await findProduct(params.slug)
  if (!product) return { title: 'Product not found' }

  const vendorName = product.vendor?.business_name
  const sample = isDemoId(product.id) ? 'Sample listing. ' : ''
  const description = [
    `${sample}${formatCurrency(product.price_ghs)}${vendorName ? ` from ${vendorName}` : ''}.`,
    product.short_description ?? '',
  ].join(' ').trim()
  const image = product.images?.[0]
  const url = `${APP_URL}/marketplace/${params.slug}`

  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'SWK Marketplace',
      url,
      title: product.title,
      description,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children
}
