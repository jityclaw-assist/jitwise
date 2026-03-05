"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ClientSummary } from "@/lib/summary";

type ClientSummaryPanelProps = {
  summary: ClientSummary;
  title?: string;
  subtitle?: string;
};

export function ClientSummaryPanel({
  summary,
  title = "Preview client version",
  subtitle = "Client summary",
}: ClientSummaryPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const formatNumber = (value: number, fractionDigits = 1) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: fractionDigits,
    }).format(value);

  const summaryText = useMemo(() => summary.summaryText, [summary]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      setCopyState("error");
    }
  };

  const handleExport = () => {
    const blob = new Blob([summaryText], {
      type: "text/markdown;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jitwise-client-summary.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {subtitle}
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copyState === "copied" ? "Copied" : "Copy summary"}
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Export Markdown
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Effort range
          </p>
          <p className="mt-2 font-semibold">
            {formatNumber(summary.hoursRange.min)} -{" "}
            {formatNumber(summary.hoursRange.max)} hrs
          </p>
          <p className="text-xs text-muted-foreground">
            Probable {formatNumber(summary.hoursRange.probable)} hrs
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pricing range
          </p>
          <p className="mt-2 font-semibold">
            ${formatNumber(summary.pricingRange.min)} - $
            {formatNumber(summary.pricingRange.max)}
          </p>
          <p className="text-xs text-muted-foreground">
            Probable ${formatNumber(summary.pricingRange.probable)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Complexity
          </p>
          <p className="mt-2 font-semibold capitalize">
            {summary.risk.level} risk · {summary.urgency.level} urgency
          </p>
          <p className="text-xs text-muted-foreground">
            Multipliers {summary.risk.multiplier}x / {summary.urgency.multiplier}
            x
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Summary markdown
        </p>
        <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
          {summaryText}
        </div>
        {copyState === "error" && (
          <p className="mt-2 text-xs text-destructive">
            Could not copy summary. Try again.
          </p>
        )}
      </div>
    </section>
  );
}
