import { Skeleton } from '@/app/_components/ui/Skeleton'

export default function ShipListLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <Skeleton className="h-7 w-28 mb-5" />
      <Skeleton className="h-10 w-80 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-card p-4"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-3 w-1/3 mt-2.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
