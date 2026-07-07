'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function MobileSortSelect({ sort }: { sort: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    params.set('page', '1')
    router.push(`/marketplace?${params.toString()}`)
  }

  return (
    <select
      className="form-input py-2 text-sm max-w-40"
      value={sort}
      onChange={handleChange}
      aria-label="Sort products"
    >
      <option value="newest">Newest</option>
      <option value="popular">Popular</option>
      <option value="price_asc">Price ↑</option>
      <option value="price_desc">Price ↓</option>
    </select>
  )
}
