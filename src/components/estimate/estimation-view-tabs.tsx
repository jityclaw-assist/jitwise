"use client";

import Link from "next/link";
import { useState } from "react";

import { ClientSummaryActions } from "@/components/estimate/client-summary-actions";
import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { ShareButton } from "@/components/estimate/share-button";
import { DeleteEstimationButton } from "@/components/estimate/delete-estimation-button";
import { DocumentsPanel } from "@/components/estimate/documents-panel";
import { OutcomePanel } from "@/components/estimate/outcome-panel";
import { ProjectBriefExport } from "@/components/estimate/project-brief-export";
import { ScopeAdvisorPanel } from "@/components/estimate/scope-advisor-panel";
import { MarkdownRenderer } from "@/components/ui/markdown";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";

type ModuleDetail = {
  id: string;
  name: string;
  complexity: string;
  provider: string | null;
  description: string;
  points: number;
};

type ModuleBreakdownRow = ModuleDetail & {
  pct: number;
  hoursProbable: number;
  hoursMin: number;
  hoursMax: number;
  costProbable: number;
};

type OutcomeRow = {
  actual_hours: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  notes: string | null;
};

type EstimationViewTabsProps = {
  estimationId: string;
  createdAt: string;
  input: EstimationInput;
  result: EstimationResult;
  clientSummary: ClientSummary;
  moduleDetails: ModuleDetail[];
  moduleBreakdown: ModuleBreakdownRow[];
  outcomeData: OutcomeRow | null;
  documentTitles: string[];
  documentCount: number;
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "summary", label: "Client summary" },
  { id: "analysis", label: "Scope analysis" },
  { id: "actuals", label: "Actuals" },
  { id: "documents", label: "Documents" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function EstimationViewTabs({
  estimationId,
  createdAt,
  input,
  result,
  clientSummary,
  moduleDetails,
  moduleBreakdown,
  outcomeData,
  documentTitles,
  documentCount,
}: EstimationViewTabsProps) {
  const [viewTab, setViewTab] = useState<Tab>("overview");

  const hasAdvisor = Boolean(clientSummary.advisorContent);
  const hasTemplate = Boolean(clientSummary.templateContent);
  const hasOutcome = Boolean(outcomeData?.actual_hours ?? outcomeData?.actual_cost);

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Saved estimate
          </p>
          <h1 className="text-2xl font-semibold">Estimate overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton estimationId={estimationId} />
          <ProjectBriefExport
            estimationInput={input}
            estimationResult={result}
            clientSummary={clientSummary}
            createdAt={createdAt}
          />
          <ClientSummaryActions
            summaryText={clientSummary.summaryText}
            estimationId={estimationId}
            createdAt={createdAt}
            input={input}
            result={result}
            clientSummary={clientSummary}
          />
          <Link
            href={`/estimate/${estimationId}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
          >
            Edit
          </Link>
          <Link
            href="/estimations"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
          >
            Back to list
          </Link>
          <DeleteEstimationButton estimationId={estimationId} />
        </div>
      </div>

      {/* Hero stat strip */}
      <div className="grid gap-3 sm:grid-cols-3 pb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Effort (probable)
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums leading-none">
            {result.hoursRange.probable}
            <span className="ml-1.5 text-base font-normal text-muted-foreground">hrs</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.hoursRange.min} – {result.hoursRange.max} hrs range
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cost (probable)
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums leading-none">
            ${result.pricingRange.probable.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ${result.pricingRange.min.toLocaleString()} – ${result.pricingRange.max.toLocaleString()} range
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Multipliers
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
              {input.riskLevel} risk · {result.riskMultiplier}x
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
              {input.urgencyLevel} urgency · {result.urgencyMultiplier}x
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ${input.hourlyRate}/hr · {result.baseScopePoints} pts
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0 mb-6">
        {TABS.map((tab) => {
          const badge =
            tab.id === "analysis" && (hasAdvisor || hasTemplate)
              ? "Saved"
              : tab.id === "actuals" && hasOutcome
                ? "Logged"
                : tab.id === "documents" && documentCount > 0
                  ? String(documentCount)
                  : null;

          return (
            <button
              key={tab.id}
              onClick={() => setViewTab(tab.id)}
              className={[
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                viewTab === tab.id
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
              {badge && (
                <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-foreground/60">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overview ── */}
      <div className={viewTab !== "overview" ? "hidden" : "flex flex-col gap-6"}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Scope modules */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Scope modules
            </h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
              {moduleDetails.map((module) => (
                <li
                  key={module.id}
                  className="rounded-lg border border-border bg-background px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{module.name}</p>
                        {module.provider && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {module.provider}
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {module.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="font-semibold uppercase">{module.complexity}</div>
                      <div>{module.points} pts</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Output ranges */}
          <section className="rounded-xl border border-border bg-foreground/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Output ranges
            </h2>
            <div className="mt-4 flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Base scope points</span>
                <span className="font-semibold">{result.baseScopePoints}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Risk multiplier</span>
                <span className="font-semibold">{result.riskMultiplier}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Urgency multiplier</span>
                <span className="font-semibold">{result.urgencyMultiplier}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hourly rate</span>
                <span className="font-semibold">${input.hourlyRate}</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Hours
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>Min</span>
                  <span className="font-semibold">{result.hoursRange.min} hrs</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Probable</span>
                  <span className="font-semibold">{result.hoursRange.probable} hrs</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Max</span>
                  <span className="font-semibold">{result.hoursRange.max} hrs</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Pricing
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>Min</span>
                  <span className="font-semibold">${result.pricingRange.min.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Probable</span>
                  <span className="font-semibold">${result.pricingRange.probable.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>Max</span>
                  <span className="font-semibold">${result.pricingRange.max.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Per-module effort breakdown */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Effort by module
          </p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">Module</th>
                <th className="pb-2 text-right font-medium">Pts</th>
                <th className="pb-2 text-right font-medium">%</th>
                <th className="pb-2 text-right font-medium">Probable hrs</th>
                <th className="pb-2 text-right font-medium">Range</th>
                <th className="pb-2 text-right font-medium">Probable cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {moduleBreakdown.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-4">
                    <span className="font-medium">{row.name}</span>
                    {row.provider && (
                      <span className="ml-2 text-xs text-muted-foreground">{row.provider}</span>
                    )}
                    <span className="ml-2 text-xs capitalize text-muted-foreground">
                      · {row.complexity}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.points}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{row.pct}%</td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {row.hoursProbable} hrs
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {row.hoursMin}–{row.hoursMax}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    ${row.costProbable.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Client summary ── */}
      <div className={viewTab !== "summary" ? "hidden" : "flex flex-col gap-6"}>
        <ClientSummaryPanel
          summary={clientSummary}
          subtitle="Client summary"
          title="Client-ready overview"
          advisorContent={clientSummary.advisorContent}
          initialGeneratedText={clientSummary.summaryText}
        />
      </div>

      {/* ── Scope analysis ── */}
      <div className={viewTab !== "analysis" ? "hidden" : "flex flex-col gap-6"}>
        <ScopeAdvisorPanel
          estimationInput={input}
          documentTitles={documentTitles}
          initialContent={clientSummary.advisorContent}
        />

        {hasTemplate && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Scope template
                </p>
                <h2 className="text-lg font-semibold text-foreground">Developer checklist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved template generated from the advisor analysis.
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(clientSummary.templateContent ?? "")
                    .catch(() => undefined);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                Copy
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background px-4 py-4">
              <MarkdownRenderer content={clientSummary.templateContent ?? ""} />
            </div>
          </section>
        )}

        {!hasAdvisor && !hasTemplate && (
          <p className="text-sm text-muted-foreground">
            No scope analysis saved yet. Use the panel above to run the advisor.
          </p>
        )}
      </div>

      {/* ── Actuals ── */}
      <div className={viewTab !== "actuals" ? "hidden" : "flex flex-col gap-6"}>
        <OutcomePanel
          estimationId={estimationId}
          estimationSummary={{
            estimatedHoursProbable: result.hoursRange.probable,
            estimatedCostProbable: result.pricingRange.probable,
          }}
          initialOutcome={outcomeData}
          advisorInsights={clientSummary.advisorInsights ?? null}
        />
      </div>

      {/* ── Documents ── */}
      <div className={viewTab !== "documents" ? "hidden" : "flex flex-col gap-6"}>
        <DocumentsPanel estimationId={estimationId} />
      </div>
    </div>
  );
}
