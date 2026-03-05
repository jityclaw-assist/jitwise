import Link from "next/link";

export default function AppHome() {
  return (
    <main className="flex flex-col gap-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Jump into a new estimate or review saved work.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          className="rounded-xl border border-border bg-card p-5 text-sm transition hover:border-foreground/20 hover:bg-foreground/5"
          href="/estimate"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            New estimate
          </p>
          <p className="mt-2 font-semibold text-foreground">
            Start a new scope build
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Walk through the step-by-step estimator.
          </p>
        </Link>
        <Link
          className="rounded-xl border border-border bg-card p-5 text-sm transition hover:border-foreground/20 hover:bg-foreground/5"
          href="/estimations"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Estimations
          </p>
          <p className="mt-2 font-semibold text-foreground">
            Review saved estimates
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Open, share, or delete previous estimates.
          </p>
        </Link>
      </div>
    </main>
  );
}
