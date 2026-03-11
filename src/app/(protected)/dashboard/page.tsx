import { BarChart3, Clock, FilePlus, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";

import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RecentEstimation = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);

export default async function DashboardPage() {
  const auth = await getAuthenticatedSupabase();
  if (!auth) return null; // middleware handles redirect

  const { supabase, user } = auth;

  const { data, count } = await supabase
    .from("estimations")
    .select("id, created_at, input, result", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const recent = (data ?? []) as RecentEstimation[];
  const totalCount = count ?? 0;

  const avgProbableHours =
    recent.length > 0
      ? recent.reduce((sum, e) => sum + e.result.hoursRange.probable, 0) /
        recent.length
      : null;

  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <main className="flex flex-col gap-8 py-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Welcome back
          </p>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
        </div>
        <Link
          href="/estimate"
          className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New estimate
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Saved estimates
            </p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">{totalCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Avg probable hours
            </p>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums">
            {avgProbableHours !== null ? formatNumber(avgProbableHours) : "—"}
          </p>
          {recent.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              from last {recent.length} estimate{recent.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Last active
            </p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-base font-semibold">
            {recent[0] ? formatDate(recent[0].created_at) : "—"}
          </p>
          {recent[0] && (
            <p className="mt-1 text-xs text-muted-foreground">
              {recent[0].input.modules.length} module
              {recent[0].input.modules.length !== 1 ? "s" : ""} ·{" "}
              {recent[0].input.riskLevel} risk
            </p>
          )}
        </div>
      </div>

      {/* Recent estimations */}
      {recent.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Recent
            </p>
            <Link
              href="/estimations"
              className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3">
            {recent.map((estimation) => (
              <Link
                key={estimation.id}
                href={`/estimations/${estimation.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-sm transition hover:border-foreground/20 hover:bg-foreground/5"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-foreground">
                    {estimation.input.modules.length} module
                    {estimation.input.modules.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(estimation.created_at)} ·{" "}
                    {estimation.input.riskLevel} risk ·{" "}
                    {estimation.input.urgencyLevel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {formatNumber(estimation.result.hoursRange.probable)} hrs
                  </p>
                  <p className="text-xs text-muted-foreground">probable</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        // First-time user
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-foreground/5">
            <FilePlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Start your first estimate</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Define scope modules, apply risk and urgency multipliers, and
              generate a client-ready summary with effort and pricing ranges.
            </p>
          </div>
          <Link
            href="/estimate"
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Create your first estimate
          </Link>
        </div>
      )}
    </main>
  );
}
