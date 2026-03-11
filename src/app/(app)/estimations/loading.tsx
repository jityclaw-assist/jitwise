import { Skeleton } from "@/components/ui/skeleton";

export default function EstimationsLoading() {
  return (
    <main className="flex flex-col gap-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Filter row */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Estimation cards */}
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3">
              <Skeleton className="h-3 w-28" />
              <div className="mt-2 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
