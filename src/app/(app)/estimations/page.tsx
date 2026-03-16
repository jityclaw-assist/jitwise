import { BarChart3 } from "lucide-react";
import Link from "next/link";

import { EstimationsCompareMode } from "@/components/estimate/estimations-compare-mode";
import { getUserPlan } from "@/lib/billing/plan";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { generateClientSummary, type ClientSummary } from "@/lib/summary";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import type {
  EstimationInput,
  EstimationResult,
  RiskLevel,
  UrgencyLevel,
} from "@/lib/schema/estimation";

type EstimationRow = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
  client_summary?: ClientSummary | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const PAGE_SIZE = 6;

const buildQueryString = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

export default async function EstimationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    risk?: string;
    urgency?: string;
  }>;
}) {
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return (
      <main className="flex flex-col gap-4 py-12">
        <h1 className="text-2xl font-semibold">Estimations</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to view and manage saved estimations.
        </p>
      </main>
    );
  }

  const { supabase, user } = auth;
  const [resolvedParams, userPlan] = await Promise.all([
    searchParams,
    getUserPlan(user.id),
  ]);
  const page = Number(resolvedParams.page ?? "1");
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sort = resolvedParams.sort === "oldest" ? "oldest" : "newest";
  const riskParam = resolvedParams.risk;
  const urgencyParam = resolvedParams.urgency;
  const risk =
    riskParam === "low" || riskParam === "medium" || riskParam === "high"
      ? (riskParam as RiskLevel)
      : undefined;
  const urgency =
    urgencyParam === "normal" ||
    urgencyParam === "expedite" ||
    urgencyParam === "rush"
      ? (urgencyParam as UrgencyLevel)
      : undefined;
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary", {
      count: "exact",
    })
    .eq("user_id", user.id);

  if (risk) {
    query = query.eq("input->>riskLevel", risk);
  }
  if (urgency) {
    query = query.eq("input->>urgencyLevel", urgency);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: sort === "oldest" })
    .range(from, to);

  if (error) {
    return (
      <main className="flex flex-col gap-4 py-12">
        <h1 className="text-2xl font-semibold">Estimations</h1>
        <p className="text-sm text-destructive">
          Failed to load estimations.
        </p>
      </main>
    );
  }

  const estimations = (data ?? []) as EstimationRow[];
  const totalCount = count ?? estimations.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const resolveSummary = (estimation: EstimationRow) =>
    estimation.client_summary ??
    generateClientSummary({
      input: estimation.input,
      result: estimation.result,
      modules: MODULE_CATALOG,
    });

  return (
    <main className="flex flex-col gap-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Estimations</h1>
          <p className="text-sm text-muted-foreground">
            Review, open, or delete saved estimates.
          </p>
        </div>
        <Link
          href="/estimate"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
        >
          New estimate
        </Link>
      </div>

      {/* Free plan limit banner — shown when 2 of 3 estimations used */}
      {!userPlan.isProActive && userPlan.estimationCount >= 2 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="text-amber-300">
            {userPlan.atEstimationLimit
              ? "You've reached the 3 estimate limit on the Free plan."
              : `${3 - userPlan.estimationCount} estimate remaining on Free plan.`}
          </p>
          <Link
            href="/pricing"
            className="shrink-0 rounded-md border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/10"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      <form
        className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm md:grid-cols-4"
        method="get"
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Sort
          </label>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Risk
          </label>
          <select
            name="risk"
            defaultValue={risk ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Urgency
          </label>
          <select
            name="urgency"
            defaultValue={urgency ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <option value="">All</option>
            <option value="normal">Normal</option>
            <option value="expedite">Expedite</option>
            <option value="rush">Rush</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md border border-border px-3 py-2 font-semibold text-foreground transition hover:bg-foreground/5"
          >
            Apply filters
          </button>
        </div>
      </form>

      {estimations.length === 0 ? (
        risk || urgency ? (
          // Filtered empty state
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              No estimations match the current filters.
            </p>
            <Link
              href="/estimations"
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          // True empty state — first-time user
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-foreground/5">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-foreground">
                No estimations yet
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Build your first scope-based estimate. Define modules, set risk
                and urgency, and generate a client-ready summary with effort
                and pricing ranges.
              </p>
            </div>
            <Link
              href="/estimate"
              className="rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
            >
              Create your first estimate
            </Link>
          </div>
        )
      ) : (
        <EstimationsCompareMode
          estimations={estimations.map((estimation) => {
            const summary = resolveSummary(estimation);
            return {
              id: estimation.id,
              createdAt: estimation.created_at,
              moduleCount: estimation.input.modules.length,
              riskLevel: estimation.input.riskLevel,
              urgencyLevel: estimation.input.urgencyLevel,
              probableHours: estimation.result.hoursRange.probable,
              summaryPreview: summary.summaryText.split("\n").slice(0, 4).join("\n"),
            };
          })}
        />
      )}

      {estimations.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Page {safePage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`?${buildQueryString({
                page: safePage > 1 ? safePage - 1 : 1,
                sort,
                risk,
                urgency,
              })}`}
              className={`rounded-md border border-border px-3 py-2 ${
                safePage === 1
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-foreground/5"
              }`}
            >
              Previous
            </Link>
            <Link
              href={`?${buildQueryString({
                page: safePage < totalPages ? safePage + 1 : totalPages,
                sort,
                risk,
                urgency,
              })}`}
              className={`rounded-md border border-border px-3 py-2 ${
                safePage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-foreground/5"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
