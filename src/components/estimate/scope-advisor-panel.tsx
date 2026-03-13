"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown";
import type { EstimationInput } from "@/lib/schema/estimation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ScopeAdvisorPanelProps = {
  estimationInput: EstimationInput | null;
  onAddToTemplate?: (items: string[]) => void;
  onAnalysisChange?: (content: string) => void;
};

const extractBulletItems = (content: string) => {
  const items = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length > 0);

  return Array.from(new Set(items));
};

const ADVISOR_SECTIONS = [
  "Missing considerations",
  "Technical complexity signals",
  "Integration or infrastructure risks",
  "Operational concerns",
  "Questions worth clarifying",
];

export function ScopeAdvisorPanel({
  estimationInput,
  onAddToTemplate,
  onAnalysisChange,
}: ScopeAdvisorPanelProps) {
  const [content, setContent] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canGenerate = Boolean(estimationInput) && status !== "loading";
  const bulletItems = extractBulletItems(content);

  const handleGenerate = async () => {
    if (!estimationInput) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Missing session token");

      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ input: estimationInput }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error ?? "Advisor request failed.");
      }

      const payload = (await response.json()) as { content?: string };
      const advisorContent = payload.content ?? "";
      setContent(advisorContent);
      onAnalysisChange?.(advisorContent);
      setSelectedItems([]);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Advisor request failed."
      );
      setStatus("error");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      {/* Header with inline action */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Scope advisor
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            Review scope completeness
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered analysis of gaps, risks, and open questions.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleGenerate}
          disabled={!canGenerate}
          aria-busy={status === "loading"}
        >
          {status === "loading"
            ? "Analyzing…"
            : content
              ? "Regenerate"
              : "Analyze scope"}
        </Button>
      </div>

      {!estimationInput && (
        <p className="mt-3 text-xs text-muted-foreground">
          Add at least one module to run the advisor.
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 text-xs text-destructive">{errorMessage}</p>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="mt-4 flex animate-pulse flex-col gap-3">
          <div className="h-3 w-1/3 rounded-full bg-foreground/10" />
          <div className="h-3 w-full rounded-full bg-foreground/10" />
          <div className="h-3 w-5/6 rounded-full bg-foreground/10" />
          <div className="h-3 w-4/5 rounded-full bg-foreground/10" />
          <div className="mt-2 h-3 w-1/4 rounded-full bg-foreground/10" />
          <div className="h-3 w-full rounded-full bg-foreground/10" />
          <div className="h-3 w-3/4 rounded-full bg-foreground/10" />
          <div className="mt-2 h-3 w-1/3 rounded-full bg-foreground/10" />
          <div className="h-3 w-5/6 rounded-full bg-foreground/10" />
        </div>
      )}

      {/* Empty state — shown before first generation */}
      {!content && status !== "loading" && !errorMessage && estimationInput && (
        <div className="mt-4 rounded-lg border border-border bg-background px-4 py-5">
          <p className="text-sm font-semibold text-foreground">
            What to expect
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The advisor reviews your selected modules and surfaces potential
            gaps, hidden complexity, integration risks, and questions worth
            clarifying before finalizing your estimate.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {ADVISOR_SECTIONS.map((section) => (
              <li
                key={section}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="text-foreground/30">→</span>
                {section}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI output */}
      {content && status !== "loading" && (
        <div className="mt-4 rounded-lg border border-border bg-background px-4 py-4">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Checklist — visually distinct card */}
      {content && status !== "loading" && bulletItems.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-foreground/[0.02] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Add to scope template
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Select items to include in your developer checklist.
              </p>
            </div>
            {selectedItems.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedItems.length} selected
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {bulletItems.map((item) => {
              const isSelected = selectedItems.includes(item);
              return (
                <label
                  key={item}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
                    isSelected
                      ? "border-foreground/30 bg-foreground/5"
                      : "border-border bg-background hover:border-foreground/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedItems((current) =>
                        isSelected
                          ? current.filter((entry) => entry !== item)
                          : [...current, item]
                      );
                    }}
                  />
                  <span className="text-sm leading-snug">{item}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={selectedItems.length === 0}
              onClick={() => onAddToTemplate?.(selectedItems)}
            >
              Add selected to template
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
