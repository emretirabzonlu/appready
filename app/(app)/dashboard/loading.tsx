import { Loader } from '@/app/_components/ui/Loader'
import { Skeleton } from '@/app/_components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <Skeleton className="h-7 w-20 mb-6" />

      {/* MetricCards skeleton */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
            <div className="pl-5 pr-4 py-4 space-y-2 relative">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent ships skeleton */}
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-2 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-card" />
        ))}
      </div>

      {/* Add ship section */}
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    </div>
  )
}
