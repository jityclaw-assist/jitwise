"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown";
import { useToast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";
import {
  buildAdvisorMarkdownAppendix,
  extractAdvisorInsights,
  type AdvisorInsights,
} from "@/lib/summary/extract-advisor-sections";

const DEBOUNCE_MS = 800;

type ClientSummaryPanelProps = {
  summary: ClientSummary;
  estimationInput?: EstimationInput;
  estimationResult?: EstimationResult;
  advisorContent?: string;
  onSummaryTextChange?: (value: string) => void;
  title?: string;
  subtitle?: string;
};

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);

function SummaryLoadingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3">
      <div className="h-3 w-1/3 rounded-full bg-foreground/10" />
      <div className="h-3 w-full rounded-full bg-foreground/10" />
      <div className="h-3 w-5/6 rounded-full bg-foreground/10" />
      <div className="h-3 w-2/3 rounded-full bg-foreground/10" />
      <div className="mt-2 h-3 w-1/4 rounded-full bg-foreground/10" />
      <div className="h-3 w-full rounded-full bg-foreground/10" />
      <div className="h-3 w-4/5 rounded-full bg-foreground/10" />
      <div className="h-3 w-3/4 rounded-full bg-foreground/10" />
      <div className="mt-2 h-3 w-1/3 rounded-full bg-foreground/10" />
      <div className="h-3 w-full rounded-full bg-foreground/10" />
      <div className="h-3 w-2/3 rounded-full bg-foreground/10" />
    </div>
  );
}

export function ClientSummaryPanel({
  summary,
  estimationInput,
  estimationResult,
  advisorContent,
  onSummaryTextChange,
  title = "Preview client version",
  subtitle = "Client summary",
}: ClientSummaryPanelProps) {
  const { toast } = useToast();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [summaryText, setSummaryText] = useState(summary.summaryText);
  const lastRequestKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    setSummaryText(summary.summaryText);
  }, [summary.summaryText]);

  useEffect(() => {
    onSummaryTextChange?.(summaryText);
  }, [summaryText, onSummaryTextChange]);

  const summaryKey = useMemo(
    () =>
      estimationInput && estimationResult
        ? JSON.stringify({ estimationInput, estimationResult, advisorContent: advisorContent ?? "" })
        : null,
    [estimationInput, estimationResult, advisorContent]
  );

  useEffect(() => {
    if (!summaryKey || !estimationInput || !estimationResult) return;
    if (lastRequestKeyRef.current === summaryKey) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortControllerRef.current?.abort();

    setAiState("loading");

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastRequestKeyRef.current = summaryKey;

      const generateSummary = async () => {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) throw new Error("Missing session token");

          const response = await fetch("/api/summary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ input: estimationInput, result: estimationResult, advisorContent }),
            signal: controller.signal,
          });

          if (!response.ok) throw new Error("Failed to generate summary.");

          const payload = (await response.json()) as { content?: string };
          if (payload.content) setSummaryText(payload.content);
          hasLoadedOnce.current = true;
          setAiState("idle");
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          hasLoadedOnce.current = true;
          setAiState("error");
          toast("AI summary failed. Showing the latest saved summary.", "error");
        }
      };

      void generateSummary();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [summaryKey, estimationInput, estimationResult, toast]);

  const insights: AdvisorInsights | null = useMemo(
    () => (advisorContent ? extractAdvisorInsights(advisorContent) : null),
    [advisorContent]
  );

  const fullExportText = useMemo(() => {
    if (!insights) return summaryText;
    const appendix = buildAdvisorMarkdownAppendix(insights);
    return appendix ? `${summaryText}\n\n---\n\n${appendix}` : summaryText;
  }, [summaryText, insights]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullExportText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      toast("Could not copy to clipboard. Try again.", "error");
    }
  };

  const handleExport = () => {
    const blob = new Blob([fullExportText], {
      type: "text/markdown;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jitwise-client-summary.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast("Summary exported as markdown.", "success");
  };

  const isFirstLoad = aiState === "loading" && !hasLoadedOnce.current;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      {/* Panel header — title only, actions moved to bottom of content */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {subtitle}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      {/* Hero stat cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Effort
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums leading-none">
            {formatNumber(summary.hoursRange.probable)}
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              hrs
            </span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {formatNumber(summary.hoursRange.min)} –{" "}
            {formatNumber(summary.hoursRange.max)} hrs range
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pricing
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums leading-none">
            ${formatNumber(summary.pricingRange.probable, 0)}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            ${formatNumber(summary.pricingRange.min)} –{" "}
            ${formatNumber(summary.pricingRange.max)} range
          </p>
        </div>
      </div>

      {/* Risk/urgency meta pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
          {summary.risk.level} risk · {summary.risk.multiplier}x
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
          {summary.urgency.level} urgency · {summary.urgency.multiplier}x
        </span>
      </div>

      {/* Summary text box with actions at bottom */}
      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Client summary
            </p>
            {advisorContent && (
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                + advisor context
              </span>
            )}
          </div>
          {aiState === "loading" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generating…</span>
            </div>
          )}
        </div>

        <div className="mt-3">
          {isFirstLoad ? (
            <SummaryLoadingSkeleton />
          ) : (
            <div
              className={`transition-opacity duration-300 ${
                aiState === "loading" ? "opacity-40" : "opacity-100"
              }`}
            >
              <MarkdownRenderer content={summaryText} />

              {insights && (insights.risks.length > 0 || insights.questions.length > 0) && (
                <div className="mt-5 flex flex-col gap-5 border-t border-border pt-5">
                  {insights.risks.length > 0 && (
                    <div>
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Risk factors & complexity
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {insights.risks.map((risk, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-foreground/80">
                            <span className="mt-0.5 shrink-0 text-muted-foreground/50">—</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insights.questions.length > 0 && (
                    <div>
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Open questions
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {insights.questions.map((q, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-foreground/80">
                            <span className="mt-0.5 shrink-0 text-muted-foreground/50">?</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!isFirstLoad && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={handleCopy}>
              {copyState === "copied" ? "Copied" : "Copy summary"}
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              Export Markdown
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
