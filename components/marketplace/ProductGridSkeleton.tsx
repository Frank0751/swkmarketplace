/** The product grid while it loads: the same shape as the cards that replace it */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-card pointer-events-none">
          <div className="skeleton w-full aspect-square rounded-none" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-3 w-2/3" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-10 w-full rounded-lg mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}
