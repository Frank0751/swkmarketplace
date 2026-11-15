import { NextResponse } from 'next/server'
import { loadSearchIndex } from '@/lib/search/index'

export const dynamic = 'force-dynamic'

// The catalogue for instant search. Public data only: live products and shops.
export async function GET() {
  const index = await loadSearchIndex()
  return NextResponse.json(index, {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=600' },
  })
}
