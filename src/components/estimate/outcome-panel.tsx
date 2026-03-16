"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OutcomePanelProps = {
  estimationId: string;
  estimationSummary?: {
    estimatedHoursProbable: number;
    estimatedCostProbable: number;
  };
  initialOutcome?: {
    actual_hours: number | null;
    actual_cost: number | null;
    completed_at: string | null;
    notes: string | null;
  } | null;
  advisorInsights?: {
    risks: string[];
    questions: string[];
  } | null;
};

const formatInputNumber = (value: number | null | undefined) =>
  typeof value === "number" ? String(value) : "";

export function OutcomePanel({
  estimationId,
  estimationSummary,
  initialOutcome,
  advisorInsights,
}: OutcomePanelProps) {
  const [actualHours, setActualHours] = useState(
    formatInputNumber(initialOutcome?.actual_hours)
  );
  const [actualCost, setActualCost] = useState(
    formatInputNumber(initialOutcome?.actual_cost)
  );
  const [completedAt, setCompletedAt] = useState(
    initialOutcome?.completed_at
      ? initialOutcome.completed_at.slice(0, 10)
      : ""
  );
  const [notes, setNotes] = useState(initialOutcome?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  };

  const estimatedHours = estimationSummary?.estimatedHoursProbable ?? null;
  const estimatedCost = estimationSummary?.estimatedCostProbable ?? null;
  const actualHoursNumber =
    actualHours.trim().length > 0 ? parseNumber(actualHours) : null;
  const actualCostNumber =
    actualCost.trim().length > 0 ? parseNumber(actualCost) : null;
  const hoursDelta =
    estimatedHours !== null && actualHoursNumber !== null
      ? actualHoursNumber - estimatedHours
      : null;
  const costDelta =
    estimatedCost !== null && actualCostNumber !== null
      ? actualCostNumber - estimatedCost
      : null;

  const handleSave = async () => {
    setStatus("saving");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const input = {
        actualHours: actualHoursNumber,
        actualCost: actualCostNumber,
        completedAt:
          completedAt.trim().length > 0
            ? new Date(`${completedAt}T00:00:00`).toISOString()
            : null,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      };

      const response = await fetch(`/api/estimations/${estimationId}/outcome`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error("Failed to save outcome.");
      }

      setStatus("saved");
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Actual outcome
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          Capture actual project results
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Record what really happened so you can compare estimates and improve accuracy.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actual hours
          </label>
          <input
            type="number"
            min={0}
            step="0.1"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={actualHours}
            onChange={(event) => setActualHours(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Total hours spent across design, build, and QA.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actual cost
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={actualCost}
            onChange={(event) => setActualCost(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Final cost charged to the client (if applicable).
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Completion date
          </label>
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={completedAt}
            onChange={(event) => setCompletedAt(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            When the work was delivered or closed.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Notes
          </label>
          <textarea
            rows={3}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Any changes in scope, client decisions, or delivery constraints.
          </p>
        </div>
      </div>

      {(estimatedHours !== null || estimatedCost !== null) && (
        <div className="mt-4 grid gap-4 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-2">
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Comparison uses the probable estimate from the original scope.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Hours comparison
            </p>
            <div className="flex items-center justify-between">
              <span>Estimated (probable)</span>
              <span className="font-semibold">
                {estimatedHours !== null ? `${estimatedHours} hrs` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Actual</span>
              <span className="font-semibold">
                {actualHoursNumber !== null ? `${actualHoursNumber} hrs` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Delta</span>
              <span>
                {hoursDelta !== null
                  ? `${hoursDelta > 0 ? "+" : ""}${hoursDelta.toFixed(1)} hrs`
                  : "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cost comparison
            </p>
            <div className="flex items-center justify-between">
              <span>Estimated (probable)</span>
              <span className="font-semibold">
                {estimatedCost !== null ? `$${estimatedCost}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Actual</span>
              <span className="font-semibold">
                {actualCostNumber !== null ? `$${actualCostNumber}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Delta</span>
              <span>
                {costDelta !== null
                  ? `${costDelta > 0 ? "+" : ""}$${costDelta.toFixed(2)}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleSave}
          aria-busy={status === "saving"}
          disabled={status === "saving"}
        >
          {status === "saving" ? "Saving..." : "Save actuals"}
        </Button>
        {status === "saved" && (
          <span className="text-xs text-muted-foreground">Saved.</span>
        )}
        {status === "error" && (
          <span className="text-xs text-destructive">
            Could not save. Check your session and try again.
          </span>
        )}
      </div>

      {/* Advisor retrospective — only shown when outcome has been filled */}
      {advisorInsights &&
        (advisorInsights.risks.length > 0 || advisorInsights.questions.length > 0) &&
        (actualHoursNumber !== null || actualCostNumber !== null) && (
          <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Advisor retrospective
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review which advisor predictions materialized. Use this to calibrate future estimates.
              </p>
            </div>

            {advisorInsights.risks.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Risk signals flagged
                </p>
                <ul className="flex flex-col gap-2">
                  {advisorInsights.risks.map((risk, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <span className="mt-0.5 shrink-0 text-muted-foreground/40">⚑</span>
                      <span className="flex-1 text-foreground/80">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advisorInsights.questions.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Open questions that were raised
                </p>
                <ul className="flex flex-col gap-2">
                  {advisorInsights.questions.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <span className="mt-0.5 shrink-0 text-muted-foreground/40">?</span>
                      <span className="flex-1 text-foreground/80">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hoursDelta !== null && (
              <p className="text-xs text-muted-foreground">
                {hoursDelta > 0
                  ? `Project ran ${hoursDelta.toFixed(1)} hrs over the probable estimate. Review which flagged risks contributed.`
                  : hoursDelta < 0
                    ? `Project came in ${Math.abs(hoursDelta).toFixed(1)} hrs under the probable estimate.`
                    : "Project matched the probable estimate exactly."}
              </p>
            )}
          </div>
        )}
    </section>
  );
}
