import Link from "next/link";
import { redirect } from "next/navigation";

import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import type { RiskLevel } from "@/lib/schema/estimation";

type EstimationRow = {
  id: string;
  created_at: string;
  input: {
    riskLevel: RiskLevel;
    modules: { moduleId: string; complexity: string }[];
  };
  result: {
    hoursRange: { min: number; probable: number; max: number };
    pricingRange: { probable: number };
  };
};

type OutcomeRow = {
  estimation_id: string;
  actual_hours: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  created_at: string;
};

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const signedNumber = (value: number, format: (v: number) => string) =>
  `${value > 0 ? "+" : ""}${format(value)}`;

export default async function InsightsPage() {
  const auth = await getAuthenticatedSupabase();
  if (!auth) {
    redirect("/login");
  }

  const { supabase, user } = auth;
  const { data: estimationsData, error: estimationsError } = await supabase
    .from("estimations")
    .select("id, created_at, input, result")
    .eq("user_id", user.id);

  const { data: outcomesData, error: outcomesError } = await supabase
    .from("estimation_outcomes")
    .select("estimation_id, actual_hours, actual_cost, completed_at, created_at")
    .eq("user_id", user.id);

  if (estimationsError || outcomesError) {
    return (
      <main className="flex flex-col gap-4 py-12">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Could not load insights yet.
        </p>
      </main>
    );
  }

  const estimations = (estimationsData ?? []) as EstimationRow[];
  const outcomes = (outcomesData ?? []) as OutcomeRow[];
  const estimationById = new Map(estimations.map((item) => [item.id, item]));

  const outcomesWithActualHours = outcomes.filter(
    (outcome) => outcome.actual_hours !== null
  );
  const outcomesWithActualCost = outcomes.filter(
    (outcome) => outcome.actual_cost !== null
  );
  const completedCount = outcomes.filter(
    (outcome) => Boolean(outcome.completed_at)
  ).length;

  const avgActualHours =
    outcomesWithActualHours.length > 0
      ? outcomesWithActualHours.reduce(
          (sum, item) => sum + (item.actual_hours ?? 0),
          0
        ) / outcomesWithActualHours.length
      : null;

  const avgActualCost =
    outcomesWithActualCost.length > 0
      ? outcomesWithActualCost.reduce(
          (sum, item) => sum + (item.actual_cost ?? 0),
          0
        ) / outcomesWithActualCost.length
      : null;

  const hoursDeltaValues = outcomes
    .map((outcome) => {
      const estimation = estimationById.get(outcome.estimation_id);
      if (!estimation || outcome.actual_hours === null) return null;
      return outcome.actual_hours - estimation.result.hoursRange.probable;
    })
    .filter((value): value is number => value !== null);

  const costDeltaValues = outcomes
    .map((outcome) => {
      const estimation = estimationById.get(outcome.estimation_id);
      if (!estimation || outcome.actual_cost === null) return null;
      return outcome.actual_cost - estimation.result.pricingRange.probable;
    })
    .filter((value): value is number => value !== null);

  const avgHoursDelta =
    hoursDeltaValues.length > 0
      ? hoursDeltaValues.reduce((sum, value) => sum + value, 0) /
        hoursDeltaValues.length
      : null;

  const avgCostDelta =
    costDeltaValues.length > 0
      ? costDeltaValues.reduce((sum, value) => sum + value, 0) /
        costDeltaValues.length
      : null;

  // Accuracy rate: % of outcomes where actual hours fell within estimated min–max range
  const outcomesWithHoursAndEst = outcomesWithActualHours.filter((o) =>
    estimationById.has(o.estimation_id)
  );
  const withinRangeCount = outcomesWithHoursAndEst.filter((o) => {
    const est = estimationById.get(o.estimation_id)!;
    return (
      o.actual_hours! >= est.result.hoursRange.min &&
      o.actual_hours! <= est.result.hoursRange.max
    );
  }).length;
  const accuracyRate =
    outcomesWithHoursAndEst.length > 0
      ? (withinRangeCount / outcomesWithHoursAndEst.length) * 100
      : null;

  // Risk level breakdown: avg hours delta per risk level
  const riskBreakdown = RISK_LEVELS.map((level) => {
    const matchingDeltas = outcomes
      .map((o) => {
        const est = estimationById.get(o.estimation_id);
        if (!est || est.input.riskLevel !== level || o.actual_hours === null)
          return null;
        return o.actual_hours - est.result.hoursRange.probable;
      })
      .filter((v): v is number => v !== null);

    const withinRange = outcomes.filter((o) => {
      const est = estimationById.get(o.estimation_id);
      if (!est || est.input.riskLevel !== level || o.actual_hours === null)
        return false;
      return (
        o.actual_hours >= est.result.hoursRange.min &&
        o.actual_hours <= est.result.hoursRange.max
      );
    }).length;

    return {
      level,
      count: matchingDeltas.length,
      avgDelta:
        matchingDeltas.length > 0
          ? matchingDeltas.reduce((sum, v) => sum + v, 0) /
            matchingDeltas.length
          : null,
      withinRange,
    };
  });

  const recentOutcomes = [...outcomes]
    .sort((a, b) => {
      const aTime = new Date(a.completed_at ?? a.created_at).getTime();
      const bTime = new Date(b.completed_at ?? b.created_at).getTime();
      return bTime - aTime;
    })
    .slice(0, 8);

  const hasAnyOutcome = outcomes.length > 0;

  // ── Module calibration signals ───────────────────────────────────────────
  type CalibrationRow = {
    moduleId: string;
    name: string;
    category: string;
    sampleSize: number;
    avgDeltaHrs: number;
    avgDeltaPct: number;
    overBudgetPct: number;
    suggestion: string;
  };

  const calibrationRows: CalibrationRow[] = MODULE_CATALOG.map((module) => {
    const relevantOutcomes = outcomes.filter((o) => {
      const est = estimationById.get(o.estimation_id);
      if (!est || o.actual_hours === null) return false;
      return est.input.modules.some((m) => m.moduleId === module.id);
    });

    if (relevantOutcomes.length < 2) return null;

    const deltas = relevantOutcomes.map((o) => {
      const est = estimationById.get(o.estimation_id)!;
      const selection = est.input.modules.find((m) => m.moduleId === module.id)!;
      const complexityEntry = module.complexity.find((c) => c.level === selection.complexity);
      const modulePts = complexityEntry?.points ?? 0;
      const basePts = est.result.baseScopePoints;
      const ratio = basePts > 0 ? modulePts / basePts : 0;
      const estimatedModuleHrs = ratio * est.result.hoursRange.probable;
      const actualModuleHrs = ratio * o.actual_hours!;
      return { delta: actualModuleHrs - estimatedModuleHrs, estimated: estimatedModuleHrs };
    });

    const avgDelta = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
    const avgEstimated = deltas.reduce((s, d) => s + d.estimated, 0) / deltas.length;
    const avgDeltaPct = avgEstimated > 0 ? (avgDelta / avgEstimated) * 100 : 0;
    const overCount = deltas.filter((d) => d.delta > 0).length;
    const overBudgetPct = (overCount / deltas.length) * 100;

    let suggestion = "Well calibrated — no change needed";
    if (avgDeltaPct > 25) suggestion = "Consistently over — select High complexity by default";
    else if (avgDeltaPct > 10) suggestion = `Add ~${Math.round(avgDeltaPct)}% buffer on this module`;
    else if (avgDeltaPct < -15) suggestion = "Often under-running — Low complexity may suffice";

    return {
      moduleId: module.id,
      name: module.name,
      category: module.category,
      sampleSize: relevantOutcomes.length,
      avgDeltaHrs: avgDelta,
      avgDeltaPct,
      overBudgetPct,
      suggestion,
    };
  }).filter((r): r is CalibrationRow => r !== null)
    .sort((a, b) => b.avgDeltaHrs - a.avgDeltaHrs);

  const MIN_CALIBRATION_OUTCOMES = 3;
  const hasCalibrationData = calibrationRows.length > 0;
  const totalOutcomesForCalibration = outcomes.filter((o) => o.actual_hours !== null).length;

  return (
    <main className="flex flex-col gap-8 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Insights
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Estimation quality snapshot
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          These metrics reflect the outcomes you have captured so far. Open any
          estimation and fill in the actual outcome to populate this page.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Total estimations
          </p>
          <p className="mt-2 text-2xl font-semibold">{estimations.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Outcomes captured
          </p>
          <p className="mt-2 text-2xl font-semibold">{outcomes.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Completed projects
          </p>
          <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Accuracy rate
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {accuracyRate !== null
              ? `${formatNumber(accuracyRate, 0)}%`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Actuals within estimated range
          </p>
        </div>
      </div>

      {/* Delta averages */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Avg actual hours
          </p>
          <p className="mt-2 text-xl font-semibold">
            {avgActualHours !== null
              ? `${formatNumber(avgActualHours)} hrs`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Avg actual cost
          </p>
          <p className="mt-2 text-xl font-semibold">
            {avgActualCost !== null ? formatCurrency(avgActualCost) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Avg hours delta
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              avgHoursDelta === null
                ? ""
                : avgHoursDelta > 0
                  ? "text-amber-500"
                  : "text-emerald-500"
            }`}
          >
            {avgHoursDelta !== null
              ? signedNumber(avgHoursDelta, (v) => `${formatNumber(v)} hrs`)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Actual minus probable
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Avg cost delta
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              avgCostDelta === null
                ? ""
                : avgCostDelta > 0
                  ? "text-amber-500"
                  : "text-emerald-500"
            }`}
          >
            {avgCostDelta !== null
              ? signedNumber(avgCostDelta, formatCurrency)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Actual minus probable
          </p>
        </div>
      </div>

      {/* Risk level breakdown */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Risk level patterns
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Accuracy by risk level
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How well each risk tier predicts actual hours.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {riskBreakdown.map(({ level, count, avgDelta, withinRange }) => (
            <div
              key={level}
              className="rounded-lg border border-border bg-background p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {level} risk
              </p>
              <p className="mt-2 text-sm">
                <span className="font-semibold text-foreground">{count}</span>
                <span className="ml-1 text-muted-foreground">
                  outcome{count !== 1 ? "s" : ""}
                </span>
              </p>
              {count > 0 && (
                <>
                  <p className="mt-1 text-sm">
                    <span
                      className={`font-semibold ${
                        avgDelta === null
                          ? ""
                          : avgDelta > 0
                            ? "text-amber-500"
                            : "text-emerald-500"
                      }`}
                    >
                      {avgDelta !== null
                        ? signedNumber(avgDelta, (v) => `${formatNumber(v)} hrs`)
                        : "—"}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      avg delta
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {withinRange} of {count} within range
                  </p>
                </>
              )}
              {count === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No outcomes yet
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent outcomes */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recent outcomes
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Latest captured results
        </h2>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          {!hasAnyOutcome && (
            <p className="text-muted-foreground">
              No outcomes captured yet. Open an estimation and record the
              actual results to start tracking accuracy.
            </p>
          )}
          {recentOutcomes.map((outcome) => {
            const estimation = estimationById.get(outcome.estimation_id);
            const estimatedHours =
              estimation?.result.hoursRange.probable ?? null;
            const estimatedCost =
              estimation?.result.pricingRange.probable ?? null;
            const hoursDelta =
              estimatedHours !== null && outcome.actual_hours !== null
                ? outcome.actual_hours - estimatedHours
                : null;
            const costDelta =
              estimatedCost !== null && outcome.actual_cost !== null
                ? outcome.actual_cost - estimatedCost
                : null;
            const isWithinRange =
              estimation && outcome.actual_hours !== null
                ? outcome.actual_hours >=
                    estimation.result.hoursRange.min &&
                  outcome.actual_hours <= estimation.result.hoursRange.max
                : null;

            return (
              <div
                key={outcome.estimation_id}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/estimations/${outcome.estimation_id}`}
                    className="text-xs font-semibold text-foreground hover:underline"
                  >
                    Estimation {outcome.estimation_id.slice(0, 8)} →
                  </Link>
                  <div className="flex items-center gap-2">
                    {isWithinRange !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isWithinRange
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {isWithinRange ? "Within range" : "Outside range"}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {outcome.completed_at
                        ? `Completed ${outcome.completed_at.slice(0, 10)}`
                        : `Captured ${outcome.created_at.slice(0, 10)}`}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Actual hours:{" "}
                    <span className="font-semibold text-foreground">
                      {outcome.actual_hours !== null
                        ? `${formatNumber(outcome.actual_hours)} hrs`
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Actual cost:{" "}
                    <span className="font-semibold text-foreground">
                      {outcome.actual_cost !== null
                        ? formatCurrency(outcome.actual_cost)
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Hours delta:{" "}
                    <span
                      className={`font-semibold ${
                        hoursDelta === null
                          ? "text-foreground"
                          : hoursDelta > 0
                            ? "text-amber-500"
                            : "text-emerald-500"
                      }`}
                    >
                      {hoursDelta !== null
                        ? signedNumber(hoursDelta, (v) =>
                            `${formatNumber(v)} hrs`
                          )
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Cost delta:{" "}
                    <span
                      className={`font-semibold ${
                        costDelta === null
                          ? "text-foreground"
                          : costDelta > 0
                            ? "text-amber-500"
                            : "text-emerald-500"
                      }`}
                    >
                      {costDelta !== null
                        ? signedNumber(costDelta, formatCurrency)
                        : "—"}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Module Calibration Signals ── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Module calibration
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Calibration signals
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How well your estimates track actual hours, broken down by module.
          Based on ratio-proportional attribution from captured outcomes.
        </p>

        {totalOutcomesForCalibration < MIN_CALIBRATION_OUTCOMES ? (
          <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm">
            <p className="text-muted-foreground">
              Not enough data yet. Complete{" "}
              {MIN_CALIBRATION_OUTCOMES - totalOutcomesForCalibration} more project
              {MIN_CALIBRATION_OUTCOMES - totalOutcomesForCalibration === 1 ? "" : "s"} and log their
              actuals to see calibration signals.
            </p>
            <Link
              href="/estimations"
              className="mt-2 block text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-70"
            >
              Log actuals on a saved estimation →
            </Link>
          </div>
        ) : !hasCalibrationData ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No modules with enough samples yet (minimum 2 outcomes per module).
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Module</th>
                  <th className="pb-2 text-right font-medium">Sample</th>
                  <th className="pb-2 text-right font-medium">Avg delta</th>
                  <th className="pb-2 text-right font-medium">Over budget</th>
                  <th className="pb-2 text-left font-medium pl-4">Suggestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calibrationRows.map((row) => {
                  const isHighSignal = row.avgDeltaPct > 20;
                  return (
                    <tr
                      key={row.moduleId}
                      className={isHighSignal ? "bg-amber-500/5" : ""}
                    >
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-foreground">{row.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{row.category}</span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <span className={row.sampleSize < 3 ? "text-amber-500" : ""}>
                          {row.sampleSize}
                          {row.sampleSize < 3 && (
                            <span className="ml-1 text-[10px]">low</span>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <span
                          className={
                            row.avgDeltaHrs > 0
                              ? "font-semibold text-amber-500"
                              : "font-semibold text-emerald-500"
                          }
                        >
                          {row.avgDeltaHrs > 0 ? "+" : ""}
                          {formatNumber(row.avgDeltaHrs)} hrs
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({row.avgDeltaPct > 0 ? "+" : ""}
                          {formatNumber(row.avgDeltaPct, 0)}%)
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full ${
                                row.overBudgetPct > 60
                                  ? "bg-red-500"
                                  : row.overBudgetPct > 40
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(row.overBudgetPct, 100)}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs tabular-nums text-muted-foreground">
                            {formatNumber(row.overBudgetPct, 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pl-4 text-xs text-muted-foreground">
                        {row.suggestion}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
