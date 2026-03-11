import { Skeleton } from "@/components/ui/skeleton";

export default function EstimateLoading() {
  return (
    <main className="flex flex-col gap-6 py-12">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Wizard card */}
      <section className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6">
        {/* Stepper */}
        <div className="flex flex-col gap-5 border-b border-border pb-6">
          <Skeleton className="h-3 w-36" />
          <div className="flex items-start">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                {i < 2 && <Skeleton className="mx-3 mt-3 h-px flex-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Module grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-5">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </section>
    </main>
  );
}
