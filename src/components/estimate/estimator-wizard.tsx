"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { Button } from "@/components/ui/button";
import type { ModuleDefinition } from "@/lib/catalog/modules";
import { calculateEstimation } from "@/lib/engine/calculate-estimation";
import { generateClientSummary } from "@/lib/summary";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ComplexityLevel,
  EstimationInput,
  RiskLevel,
  UrgencyLevel,
} from "@/lib/schema/estimation";

type Step = 1 | 2 | 3;

type EstimatorWizardProps = {
  modules: ModuleDefinition[];
  estimationId?: string;
  initialInput?: EstimationInput;
};

const STEP_LABELS: Record<Step, string> = {
  1: "Scope modules",
  2: "Risk and urgency",
  3: "Review output",
};

const DEFAULT_HOURLY_RATE = 120;

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);

export function EstimatorWizard({
  modules,
  estimationId,
  initialInput,
}: EstimatorWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedModules, setSelectedModules] = useState<
    Record<string, ComplexityLevel>
  >(() => {
    if (!initialInput) {
      return {};
    }
    return Object.fromEntries(
      initialInput.modules.map((item) => [item.moduleId, item.complexity])
    );
  });
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(
    initialInput?.riskLevel ?? "medium"
  );
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(
    initialInput?.urgencyLevel ?? "normal"
  );
  const [hourlyRate, setHourlyRate] = useState<number>(
    initialInput?.hourlyRate ?? DEFAULT_HOURLY_RATE
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savedId, setSavedId] = useState<string | null>(
    estimationId ?? null
  );

  const selectionList = useMemo(
    () =>
      Object.entries(selectedModules).map(([moduleId, complexity]) => ({
        moduleId,
        complexity,
      })),
    [selectedModules]
  );

  const estimationInput: EstimationInput | null =
    selectionList.length > 0
      ? {
          modules: selectionList,
          riskLevel,
          urgencyLevel,
          hourlyRate,
        }
      : null;

  const estimationResult = useMemo(() => {
    if (!estimationInput) {
      return null;
    }
    return calculateEstimation(estimationInput);
  }, [estimationInput]);

  useEffect(() => {
    setSaveState("idle");
    setSavedId(null);
  }, [selectionList, riskLevel, urgencyLevel, hourlyRate]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((current) => {
      if (current[moduleId]) {
        const { [moduleId]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [moduleId]: "standard" };
    });
  };

  const updateComplexity = (moduleId: string, complexity: ComplexityLevel) => {
    setSelectedModules((current) => ({
      ...current,
      [moduleId]: complexity,
    }));
  };

  const canAdvance = step === 1 ? selectionList.length > 0 : true;
  const canGoBack = step > 1;
  const canSave = Boolean(estimationResult) && saveState !== "saving";
  const isEditMode = Boolean(estimationId);

  const handleSave = async () => {
    if (!estimationInput) {
      return;
    }

    setSaveState("saving");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch(
        estimationId ? `/api/estimations/${estimationId}` : "/api/estimations",
        {
          method: estimationId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ input: estimationInput }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save estimation.");
      }

      const data = (await response.json()) as { id?: string };
      setSavedId(data.id ?? estimationId ?? null);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
    }
  };

  return (
    <section className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Estimation workflow
        </p>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          {([1, 2, 3] as Step[]).map((item) => (
            <div
              key={item}
              className={`rounded-xl border px-4 py-3 ${
                step === item
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Step {item}
              </p>
              <p className="mt-1 text-sm font-medium">{STEP_LABELS[item]}</p>
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((module) => {
              const isSelected = Boolean(selectedModules[module.id]);
              const selectedComplexity = selectedModules[module.id] ?? "standard";
              const checkboxId = `module-${module.id}`;

              return (
                <div
                  key={module.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-foreground/30 bg-foreground/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 text-sm font-semibold">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={isSelected}
                          onChange={() => toggleModule(module.id)}
                        />
                        <label htmlFor={checkboxId}>{module.name}</label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                      {module.provider && (
                        <p className="text-xs font-medium text-muted-foreground">
                          Provider: {module.provider}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold uppercase tracking-[0.2em]">
                        Complexity
                      </span>
                      <select
                        aria-label={`${module.name} complexity`}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        value={selectedComplexity}
                        disabled={!isSelected}
                        onChange={(event) =>
                          updateComplexity(
                            module.id,
                            event.target.value as ComplexityLevel
                          )
                        }
                      >
                        {module.complexity.map((level) => (
                          <option key={level.level} value={level.level}>
                            {level.level} ({level.points} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Risk level
            </p>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={riskLevel}
              onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}
            >
              <option value="low">Low (known scope)</option>
              <option value="medium">Medium (some unknowns)</option>
              <option value="high">High (complex or unclear)</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Urgency
            </p>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={urgencyLevel}
              onChange={(event) =>
                setUrgencyLevel(event.target.value as UrgencyLevel)
              }
            >
              <option value="normal">Normal timeline</option>
              <option value="expedite">Expedite</option>
              <option value="rush">Rush</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Hourly rate
            </p>
            <input
              type="number"
              min={1}
              step={1}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={hourlyRate}
              onChange={(event) =>
                setHourlyRate(
                  Number.isNaN(Number(event.target.value))
                    ? 0
                    : Number(event.target.value)
                )
              }
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Scope summary
              </p>
              {selectionList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select at least one module to generate an estimate.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {selectionList.map((selection) => {
                    const module = modules.find(
                      (entry) => entry.id === selection.moduleId
                    );
                    if (!module) {
                      return null;
                    }
                    return (
                      <li
                        key={selection.moduleId}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <span>{module.name}</span>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {selection.complexity}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-foreground/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Estimation output
              </p>
              {!estimationResult ? (
                <p className="text-sm text-muted-foreground">
                  Complete step 1 to view calculated ranges.
                </p>
              ) : (
                <div className="flex flex-col gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Base scope points</span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.baseScopePoints)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Risk multiplier</span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.riskMultiplier, 2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Urgency multiplier</span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.urgencyMultiplier, 2)}x
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Hours range
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Min</span>
                      <span className="font-semibold">
                        {formatNumber(estimationResult.hoursRange.min)} hrs
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Probable</span>
                      <span className="font-semibold">
                        {formatNumber(estimationResult.hoursRange.probable)} hrs
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Max</span>
                      <span className="font-semibold">
                        {formatNumber(estimationResult.hoursRange.max)} hrs
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Pricing range
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Min</span>
                      <span className="font-semibold">
                        ${formatNumber(estimationResult.pricingRange.min)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Probable</span>
                      <span className="font-semibold">
                        ${formatNumber(estimationResult.pricingRange.probable)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Max</span>
                      <span className="font-semibold">
                        ${formatNumber(estimationResult.pricingRange.max)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="secondary"
                      disabled={!canSave}
                      onClick={handleSave}
                      aria-busy={saveState === "saving"}
                    >
                      {saveState === "saving"
                        ? "Saving..."
                        : isEditMode
                          ? "Update estimation"
                          : "Save estimation"}
                    </Button>
                    {saveState === "saved" && savedId && (
                      <p className="text-xs text-muted-foreground">
                        {isEditMode ? "Updated." : "Saved."}{" "}
                        <Link
                          href={`/estimations/${savedId}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          View saved estimate
                        </Link>
                      </p>
                    )}
                    {saveState === "error" && (
                      <p className="text-xs text-destructive">
                        Could not save. Check your session and try again.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {estimationResult && estimationInput && (
            <ClientSummaryPanel
              summary={generateClientSummary({
                input: estimationInput,
                result: estimationResult,
                modules,
              })}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Step {step} of 3
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={!canGoBack}
            onClick={() => setStep((current) => (current - 1) as Step)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              disabled={!canAdvance}
              onClick={() => setStep((current) => (current + 1) as Step)}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={() => setStep(1)}>Start Over</Button>
          )}
        </div>
      </div>
    </section>
  );
}
