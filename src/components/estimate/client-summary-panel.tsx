"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown";
import { useToast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";

const DEBOUNCE_MS = 800;

type ClientSummaryPanelProps = {
  summary: ClientSummary;
  estimationInput?: EstimationInput;
  estimationResult?: EstimationResult;
  onSummaryTextChange?: (value: string) => void;
  title?: string;
  subtitle?: string;
};

export function ClientSummaryPanel({
  summary,
  estimationInput,
  estimationResult,
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

  useEffect(() => {
    setSummaryText(summary.summaryText);
  }, [summary.summaryText]);

  useEffect(() => {
    onSummaryTextChange?.(summaryText);
  }, [summaryText, onSummaryTextChange]);

  const formatNumber = (value: number, fractionDigits = 1) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: fractionDigits,
    }).format(value);

  const summaryKey = useMemo(
    () =>
      estimationInput && estimationResult
        ? JSON.stringify({
            estimationInput,
            estimationResult,
          })
        : null,
    [estimationInput, estimationResult]
  );

  useEffect(() => {
    if (!summaryKey || !estimationInput || !estimationResult) return;
    if (lastRequestKeyRef.current === summaryKey) return;

    // Cancel any pending debounce and in-flight request
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortControllerRef.current?.abort();

    // Show pending state immediately so user knows something is coming
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
            body: JSON.stringify({
              input: estimationInput,
              result: estimationResult,
            }),
            signal: controller.signal,
          });

          if (!response.ok) throw new Error("Failed to generate summary.");

          const payload = (await response.json()) as { content?: string };
          if (payload.content) setSummaryText(payload.content);
          setAiState("idle");
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      toast("Could not copy to clipboard. Try again.", "error");
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
    toast("Summary exported as markdown.", "success");
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
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Summary markdown
          </p>
          {aiState === "loading" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generating…</span>
            </div>
          )}
        </div>
        <div className={`mt-3 transition-opacity duration-300 ${aiState === "loading" ? "opacity-40" : "opacity-100"}`}>
          <MarkdownRenderer content={summaryText} />
        </div>
      </div>
    </section>
  );
}
