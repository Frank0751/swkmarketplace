const SKELETON_COUNT = 8

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="product-card pointer-events-none">
          {/* Image skeleton — 4:3 aspect ratio */}
          <div className="w-full rounded-lg overflow-hidden bg-sand-100" style={{ aspectRatio: '4/3' }}>
            <div className="skeleton w-full h-full" />
          </div>

          {/* Card body */}
          <div className="p-3 space-y-2">
            {/* Vendor name skeleton */}
            <div className="skeleton h-3 w-24 rounded" />

            {/* Title skeleton — two lines */}
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>

            {/* Location skeleton */}
            <div className="skeleton h-3 w-28 rounded" />

            {/* Badge skeleton */}
            <div className="flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>

            {/* Price + button row */}
            <div className="flex items-center justify-between pt-1">
              <div className="skeleton h-5 w-20 rounded" />
              <div className="skeleton h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
