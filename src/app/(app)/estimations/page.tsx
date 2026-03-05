import Link from "next/link";

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
  searchParams: {
    page?: string;
    sort?: string;
    risk?: string;
    urgency?: string;
  };
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
  const page = Number(searchParams.page ?? "1");
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const sort = searchParams.sort === "oldest" ? "oldest" : "newest";
  const riskParam = searchParams.risk;
  const urgencyParam = searchParams.urgency;
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
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <p>No estimations saved yet.</p>
          <Link
            href="/estimate"
            className="text-sm font-semibold text-foreground hover:underline"
          >
            Create your first estimate
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {estimations.map((estimation) => {
            const summary = resolveSummary(estimation);
            const previewLines = summary.summaryText
              .split("\n")
              .slice(0, 4)
              .join("\n");

            return (
              <Link
                key={estimation.id}
                href={`/estimations/${estimation.id}`}
                className="rounded-xl border border-border bg-card p-5 text-sm transition hover:border-foreground/20 hover:bg-foreground/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {formatDate(estimation.created_at)}
                    </p>
                    <p className="mt-2 font-semibold text-foreground">
                      {estimation.input.modules.length} modules
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Risk: {estimation.input.riskLevel} / Urgency:{" "}
                      {estimation.input.urgencyLevel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Probable</p>
                    <p className="text-sm font-semibold">
                      {Math.round(estimation.result.hoursRange.probable)} hrs
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Client summary preview
                  </p>
                  <p className="mt-2 whitespace-pre-line">{previewLines}</p>
                </div>
              </Link>
            );
          })}
        </div>
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
