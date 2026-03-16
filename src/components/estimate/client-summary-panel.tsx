"use client";

import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";
import {
  buildAdvisorMarkdownAppendix,
  extractAdvisorInsights,
  type AdvisorInsights,
} from "@/lib/summary/extract-advisor-sections";
import {
  buildPlainTextSummary,
  parseStructuredSummary,
  type ParsedSections,
} from "@/lib/summary/parse-structured-summary";

const DEBOUNCE_MS = 800;

type ClientSummaryPanelProps = {
  summary: ClientSummary;
  estimationInput?: EstimationInput;
  estimationResult?: EstimationResult;
  advisorContent?: string;
  onSummaryTextChange?: (value: string) => void;
  title?: string;
  subtitle?: string;
  initialGeneratedText?: string;
};

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);

// ── Skeleton loaders ──────────────────────────────────────────────────────────

function SectionCardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-foreground/10" />
        <div className="h-3 w-40 rounded-full bg-foreground/10" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-md border border-transparent p-2"
          >
            <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-foreground/10" />
            <div className="h-3 flex-1 rounded-full bg-foreground/10" style={{ width: `${70 + (i % 3) * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <SectionCardSkeleton lines={5} />
      <SectionCardSkeleton lines={4} />
      <SectionCardSkeleton lines={3} />
      <div className="mt-2 flex animate-pulse flex-col gap-3">
        <div className="h-3 w-1/3 rounded-full bg-foreground/10" />
        <div className="h-3 w-full rounded-full bg-foreground/10" />
        <div className="h-3 w-5/6 rounded-full bg-foreground/10" />
      </div>
    </div>
  );
}

// ── Structured section cards ──────────────────────────────────────────────────

function IncludedCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-800 dark:text-green-300">
          Qué incluye esta propuesta
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-md border-l-[3px] border-green-400 bg-white px-3 py-2 text-sm text-gray-700 dark:border-green-600 dark:bg-green-950/30 dark:text-gray-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExcludedCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-gray-400">
          Qué no incluye esta propuesta
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-md border-l-[3px] border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NextStepsCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-300">
          Para iniciar necesitamos
        </p>
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-md border-l-[3px] border-blue-400 bg-white px-3 py-2 text-sm text-gray-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-gray-200"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-blue-300 text-[10px] font-bold text-blue-500 dark:border-blue-600 dark:text-blue-400">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientSummaryPanel({
  summary,
  estimationInput,
  estimationResult,
  advisorContent,
  onSummaryTextChange,
  title = "Preview client version",
  subtitle = "Client summary",
  initialGeneratedText,
}: ClientSummaryPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [summaryText, setSummaryText] = useState(initialGeneratedText ?? summary.summaryText);
  const lastRequestKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnce = useRef(Boolean(initialGeneratedText));

  useEffect(() => {
    if (!initialGeneratedText) setSummaryText(summary.summaryText);
  }, [summary.summaryText, initialGeneratedText]);

  // Pre-seed the request key so auto-generation is skipped when we already have saved content
  useEffect(() => {
    if (initialGeneratedText && summaryKey) {
      lastRequestKeyRef.current = summaryKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          sileo.error({ title: "AI summary failed.", description: "Showing the latest saved summary." });
        }
      };

      void generateSummary();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [summaryKey, estimationInput, estimationResult]);

  const insights: AdvisorInsights | null = useMemo(
    () => (advisorContent ? extractAdvisorInsights(advisorContent) : null),
    [advisorContent]
  );

  const parsed: ParsedSections = useMemo(
    () => parseStructuredSummary(summaryText),
    [summaryText]
  );

  const handleCopy = async () => {
    try {
      const textToCopy = parsed.hasStructuredSections
        ? buildPlainTextSummary(parsed)
        : (() => {
            if (!insights) return summaryText;
            const appendix = buildAdvisorMarkdownAppendix(insights);
            return appendix ? `${summaryText}\n\n---\n\n${appendix}` : summaryText;
          })();
      await navigator.clipboard.writeText(textToCopy);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      sileo.error({ title: "Could not copy to clipboard. Try again." });
    }
  };

  const handleExport = () => {
    const content = parsed.hasStructuredSections
      ? buildPlainTextSummary(parsed)
      : (() => {
          if (!insights) return summaryText;
          const appendix = buildAdvisorMarkdownAppendix(insights);
          return appendix ? `${summaryText}\n\n---\n\n${appendix}` : summaryText;
        })();
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jitwise-client-summary.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
    sileo.success({ title: "Summary exported as markdown." });
  };

  const isFirstLoad = aiState === "loading" && !hasLoadedOnce.current;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      {/* Panel header */}
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
            <span className="ml-1.5 text-base font-normal text-muted-foreground">hrs</span>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {formatNumber(summary.hoursRange.min)} – {formatNumber(summary.hoursRange.max)} hrs range
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
            ${formatNumber(summary.pricingRange.min)} – ${formatNumber(summary.pricingRange.max)} range
          </p>
        </div>
      </div>

      {/* Risk / urgency pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
          {summary.risk.level} risk · {summary.risk.multiplier}x
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-muted-foreground">
          {summary.urgency.level} urgency · {summary.urgency.multiplier}x
        </span>
      </div>

      {/* Summary content */}
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
              className={`flex flex-col gap-4 transition-opacity duration-300 ${
                aiState === "loading" ? "opacity-40" : "opacity-100"
              }`}
            >
              {/* Structured section cards — only rendered when sections are present */}
              {parsed.hasStructuredSections && (
                <>
                  {parsed.included.length > 0 && <IncludedCard items={parsed.included} />}
                  {parsed.excluded.length > 0 && <ExcludedCard items={parsed.excluded} />}
                  {parsed.nextSteps.length > 0 && <NextStepsCard items={parsed.nextSteps} />}
                </>
              )}

              {/* Free markdown (Descripción, Consideraciones, Nota final, or legacy summaries) */}
              {parsed.freeMarkdown && (
                <div className={parsed.hasStructuredSections ? "border-t border-border pt-4" : ""}>
                  <MarkdownRenderer content={parsed.freeMarkdown} />
                </div>
              )}

              {/* Advisor insights fallback (for old summaries without structured sections) */}
              {!parsed.hasStructuredSections &&
                insights &&
                (insights.risks.length > 0 || insights.questions.length > 0) && (
                  <div className="flex flex-col gap-5 border-t border-border pt-5">
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
