import { Skeleton } from '@/app/_components/ui/Skeleton'

export default function ShipDetailLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-20" />

      {/* ShipHero skeleton */}
      <div className="rounded-card overflow-hidden bg-navy-900/40">
        <div className="px-6 pt-6 pb-5 flex justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 bg-white/10" />
            <Skeleton className="h-4 w-36 bg-white/10" />
          </div>
          <Skeleton className="h-7 w-24 rounded-sm bg-white/10 shrink-0" />
        </div>
        <div className="mx-6 h-px bg-white/10" />
        <div className="px-6 py-4 grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-8 bg-white/10" />
              <Skeleton className="h-4 w-16 bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* MetricCards skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-[3px] bg-border" />
            <div className="pl-5 pr-4 py-4 space-y-2 relative">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Analysis section skeleton */}
      <div>
        <Skeleton className="h-6 w-56 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-card p-4 space-y-2">
              <Skeleton className="h-3 w-32 mb-3" />
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-6 rounded-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
