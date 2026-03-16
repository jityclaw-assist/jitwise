"use client";

import Link from "next/link";
import { useState } from "react";

import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";

type EstimationData = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
  client_summary?: Pick<ClientSummary, "summaryText"> | null;
};

type ComparisonViewProps = {
  estimations: EstimationData[];
};

const fmt = (v: number, dec = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: dec }).format(v);

const formatDate = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function DeltaBadge({ value, baseValue }: { value: number; baseValue: number }) {
  if (value === baseValue) return null;
  const delta = value - baseValue;
  const isHigher = delta > 0;
  return (
    <span
      className={`ml-1.5 text-[11px] font-semibold ${
        isHigher ? "text-amber-500" : "text-emerald-500"
      }`}
    >
      {isHigher ? "+" : ""}
      {fmt(delta, 1)}
    </span>
  );
}

export function ComparisonView({ estimations }: ComparisonViewProps) {
  const [normalizeRate, setNormalizeRate] = useState(false);
  const [customRate, setCustomRate] = useState<string>("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const appliedRate = normalizeRate && Number(customRate) > 0 ? Number(customRate) : null;

  const getEffectiveCost = (result: EstimationResult, input: EstimationInput) => {
    if (!appliedRate) return result.pricingRange;
    const rate = appliedRate / input.hourlyRate;
    return {
      min: Math.round(result.pricingRange.min * rate),
      probable: Math.round(result.pricingRange.probable * rate),
      max: Math.round(result.pricingRange.max * rate),
    };
  };

  // Build union of all module IDs across estimations
  const allModuleIds = Array.from(
    new Set(estimations.flatMap((e) => e.input.modules.map((m) => m.moduleId)))
  );

  const lowestProbableHrs = Math.min(...estimations.map((e) => e.result.hoursRange.probable));
  const lowestProbableCost = Math.min(
    ...estimations.map((e) => getEffectiveCost(e.result, e.input).probable)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-separate border-spacing-0 text-sm">
        {/* Column headers */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-40 min-w-[10rem] border-b border-border bg-background py-3 pr-4 text-left text-xs font-medium text-muted-foreground" />
            {estimations.map((e) => (
              <th
                key={e.id}
                className="border-b border-border px-4 py-3 text-left align-top"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {formatDate(e.created_at)}
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {e.input.modules.length} modules
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {e.input.riskLevel} risk
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {e.input.urgencyLevel}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    ${e.input.hourlyRate}/hr
                  </span>
                </div>
                <Link
                  href={`/estimations/${e.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  View full estimate →
                </Link>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ── Key numbers ── */}
          <tr className="bg-foreground/[0.02]">
            <td className="sticky left-0 z-10 border-b border-border bg-foreground/[0.02] py-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Probable hrs
            </td>
            {estimations.map((e) => {
              const isLowest = e.result.hoursRange.probable === lowestProbableHrs;
              return (
                <td key={e.id} className="border-b border-border px-4 py-3">
                  <span className={`text-lg font-bold tabular-nums ${isLowest ? "text-emerald-500" : ""}`}>
                    {fmt(e.result.hoursRange.probable)} hrs
                  </span>
                  {!isLowest && (
                    <DeltaBadge value={e.result.hoursRange.probable} baseValue={lowestProbableHrs} />
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmt(e.result.hoursRange.min)}–{fmt(e.result.hoursRange.max)}
                  </p>
                </td>
              );
            })}
          </tr>

          <tr className="bg-foreground/[0.02]">
            <td className="sticky left-0 z-10 border-b border-border bg-foreground/[0.02] py-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Probable cost
              {appliedRate && (
                <span className="ml-1 font-normal text-muted-foreground/60">*</span>
              )}
            </td>
            {estimations.map((e) => {
              const cost = getEffectiveCost(e.result, e.input);
              const isLowest = cost.probable === lowestProbableCost;
              return (
                <td key={e.id} className="border-b border-border px-4 py-3">
                  <span className={`text-lg font-bold tabular-nums ${isLowest ? "text-emerald-500" : ""}`}>
                    ${fmt(cost.probable, 0)}
                  </span>
                  {!isLowest && (
                    <DeltaBadge value={cost.probable} baseValue={lowestProbableCost} />
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ${fmt(cost.min, 0)}–${fmt(cost.max, 0)}
                  </p>
                </td>
              );
            })}
          </tr>

          {/* ── Normalize rate toggle ── */}
          <tr>
            <td colSpan={estimations.length + 1} className="border-b border-border px-0 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={normalizeRate}
                    onChange={(e) => setNormalizeRate(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  Normalize to same rate
                </label>
                {normalizeRate && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Rate/hr"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      className="w-24 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">/hr</span>
                  </div>
                )}
                {appliedRate && (
                  <span className="text-[11px] text-muted-foreground">
                    * Recalculated at ${appliedRate}/hr
                  </span>
                )}
              </div>
            </td>
          </tr>

          {/* ── Why they differ ── */}
          <tr>
            <td
              colSpan={estimations.length + 1}
              className="border-b border-border pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Why they differ
            </td>
          </tr>

          {(["baseScopePoints", "riskMultiplier", "urgencyMultiplier"] as const).map((key) => {
            const label =
              key === "baseScopePoints"
                ? "Base scope points"
                : key === "riskMultiplier"
                  ? "Risk multiplier"
                  : "Urgency multiplier";
            const minVal = Math.min(...estimations.map((e) => e.result[key]));
            return (
              <tr key={key}>
                <td className="sticky left-0 z-10 border-b border-border bg-background py-2.5 pr-4 text-xs text-muted-foreground">
                  {label}
                </td>
                {estimations.map((e) => {
                  const val = e.result[key];
                  const isMin = val === minVal;
                  return (
                    <td key={e.id} className="border-b border-border px-4 py-2.5">
                      <span className={`font-semibold tabular-nums ${isMin ? "" : "text-amber-500"}`}>
                        {key === "baseScopePoints" ? val : `${val}x`}
                      </span>
                      {!isMin && <DeltaBadge value={val} baseValue={minVal} />}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* ── Module diff ── */}
          <tr>
            <td
              colSpan={estimations.length + 1}
              className="border-b border-border pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Module breakdown
            </td>
          </tr>

          {allModuleIds.map((moduleId) => {
            const catalogEntry = MODULE_CATALOG.find((m) => m.id === moduleId);
            const name = catalogEntry?.name ?? moduleId;
            return (
              <tr key={moduleId} className="hover:bg-foreground/[0.02]">
                <td className="sticky left-0 z-10 border-b border-border bg-background py-2.5 pr-4 text-xs text-foreground">
                  {name}
                </td>
                {estimations.map((e) => {
                  const selection = e.input.modules.find((m) => m.moduleId === moduleId);
                  return (
                    <td key={e.id} className="border-b border-border px-4 py-2.5">
                      {selection ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs capitalize text-foreground">
                          {selection.complexity}
                          {selection.provider && (
                            <span className="text-muted-foreground">· {selection.provider}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* ── Summary preview accordion ── */}
          <tr>
            <td colSpan={estimations.length + 1} className="pt-4">
              <button
                onClick={() => setSummaryOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>{summaryOpen ? "▾" : "▸"}</span>
                Client summary preview
              </button>
            </td>
          </tr>

          {summaryOpen && (
            <tr>
              <td className="sticky left-0 z-10 border-t border-border bg-background pt-3 pr-4 text-xs text-muted-foreground">
                Summary
              </td>
              {estimations.map((e) => {
                const preview = (e.client_summary?.summaryText ?? "")
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" ");
                return (
                  <td key={e.id} className="border-t border-border px-4 pt-3 align-top">
                    <p className="text-xs text-muted-foreground">{preview || "—"}</p>
                    <Link
                      href={`/estimations/${e.id}`}
                      className="mt-1 block text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Read full summary →
                    </Link>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
