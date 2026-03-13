"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { ScopeAdvisorPanel } from "@/components/estimate/scope-advisor-panel";
import { ScopeTemplatePanel } from "@/components/estimate/scope-template-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ModuleCategory, ModuleDefinition } from "@/lib/catalog/modules";
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

type ModuleState = {
  complexity: ComplexityLevel;
  provider?: string;
};

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

const CATEGORY_ORDER: ModuleCategory[] = [
  "Core",
  "Commerce",
  "Data",
  "Infrastructure",
  "Internal",
];

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
    Record<string, ModuleState>
  >(() => {
    if (!initialInput) return {};
    return Object.fromEntries(
      initialInput.modules.map((item) => {
        const catalogModule = modules.find((m) => m.id === item.moduleId);
        const savedProvider = item.provider;
        const isKnown =
          !savedProvider || catalogModule?.providers?.includes(savedProvider);
        return [
          item.moduleId,
          {
            complexity: item.complexity,
            provider: isKnown
              ? (savedProvider ?? catalogModule?.providers?.[0])
              : "Other",
          },
        ];
      })
    );
  });

  const [customProviders, setCustomProviders] = useState<
    Record<string, string>
  >(() => {
    if (!initialInput) return {};
    const result: Record<string, string> = {};
    for (const item of initialInput.modules) {
      if (!item.provider) continue;
      const catalogModule = modules.find((m) => m.id === item.moduleId);
      const isKnown = catalogModule?.providers?.includes(item.provider);
      if (!isKnown) result[item.moduleId] = item.provider;
    }
    return result;
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
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [savedId, setSavedId] = useState<string | null>(
    estimationId ?? null
  );
  const [templateItems, setTemplateItems] = useState<string[]>([]);
  const [summaryMarkdown, setSummaryMarkdown] = useState<string>("");
  const [advisorContent, setAdvisorContent] = useState<string>("");

  const selectionList = useMemo(
    () =>
      Object.entries(selectedModules).map(([moduleId, state]) => {
        const effectiveProvider =
          state.provider === "Other"
            ? customProviders[moduleId] || undefined
            : state.provider;
        return {
          moduleId,
          complexity: state.complexity,
          ...(effectiveProvider ? { provider: effectiveProvider } : {}),
        };
      }),
    [selectedModules, customProviders]
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
      const catalogModule = modules.find((m) => m.id === moduleId);
      return {
        ...current,
        [moduleId]: {
          complexity: "standard",
          provider: catalogModule?.providers?.[0],
        },
      };
    });
    // Clear any custom provider text when unchecking
    setCustomProviders((current) => {
      const { [moduleId]: _, ...rest } = current;
      return rest;
    });
  };

  const updateCustomProvider = (moduleId: string, value: string) => {
    setCustomProviders((current) => ({ ...current, [moduleId]: value }));
  };

  const updateComplexity = (moduleId: string, complexity: ComplexityLevel) => {
    setSelectedModules((current) => ({
      ...current,
      [moduleId]: { ...current[moduleId], complexity },
    }));
  };

  const updateProvider = (moduleId: string, provider: string) => {
    setSelectedModules((current) => ({
      ...current,
      [moduleId]: { ...current[moduleId], provider },
    }));
  };

  const canAdvance = step === 1 ? selectionList.length > 0 : true;
  const canGoBack = step > 1;
  const canSave = Boolean(estimationResult) && saveState !== "saving";
  const isEditMode = Boolean(estimationId);
  const canGenerateTemplate = Boolean(estimationInput);

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
          body: JSON.stringify({ input: estimationInput, advisorContent: advisorContent || undefined }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save estimation.");
      }

      const data = (await response.json()) as { id?: string };
      setSavedId(data.id ?? estimationId ?? null);
      setSaveState("saved");
      toast(isEditMode ? "Estimation updated." : "Estimation saved.", "success");
    } catch (error) {
      setSaveState("error");
      toast("Could not save. Check your session and try again.", "error");
    }
  };

  return (
    <section className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Estimation workflow
        </p>

        {/* Stepper */}
        <div className="flex items-start">
          {([1, 2, 3] as Step[]).map((item, index) => {
            const isCompleted = step > item;
            const isCurrent = step === item;
            const isLast = index === 2;

            return (
              <Fragment key={item}>
                {/* Step node */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200 ${
                      isCompleted
                        ? "border-[#00ACFF] bg-[#00ACFF] text-black"
                        : isCurrent
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-transparent text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : item}
                  </div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-[#00ACFF]/70"
                          : "text-muted-foreground"
                    }`}
                  >
                    {STEP_LABELS[item]}
                  </p>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`mx-3 mt-3.5 h-px flex-1 transition-colors duration-300 ${
                      isCompleted ? "bg-[#00ACFF]/50" : "bg-border"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6">
          {CATEGORY_ORDER.filter((cat) =>
            modules.some((m) => m.category === cat)
          ).map((category) => (
            <div key={category} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {category}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
            {modules.filter((m) => m.category === category).map((module) => {
              const moduleState = selectedModules[module.id];
              const isSelected = Boolean(moduleState);
              const selectedComplexity = moduleState?.complexity ?? "standard";
              const selectedProvider = moduleState?.provider ?? module.providers?.[0];
              const hasProviders = module.providers && module.providers.length > 1;
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
                      {hasProviders && (
                        <>
                          <span className="mt-1 font-semibold uppercase tracking-[0.2em]">
                            Provider
                          </span>
                          <select
                            aria-label={`${module.name} provider`}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                            value={selectedProvider}
                            disabled={!isSelected}
                            onChange={(event) =>
                              updateProvider(module.id, event.target.value)
                            }
                          >
                            {module.providers!.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                            <option value="Other">Other…</option>
                          </select>
                          {isSelected && selectedProvider === "Other" && (
                            <input
                              type="text"
                              aria-label={`${module.name} custom provider`}
                              placeholder="Specify provider…"
                              value={customProviders[module.id] ?? ""}
                              onChange={(event) =>
                                updateCustomProvider(module.id, event.target.value)
                              }
                              className="rounded-md border border-[#00ACFF]/50 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00ACFF]/50"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          ))}
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

          {/* ① Primary output — probable result front and center */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Estimate result
            </p>
            {!estimationResult ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Select at least one module in step 1 to see results.
              </p>
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Probable hours</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums leading-none">
                    {formatNumber(estimationResult.hoursRange.probable)}
                    <span className="ml-1.5 text-base font-normal text-muted-foreground">
                      hrs
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatNumber(estimationResult.hoursRange.min)} –{" "}
                    {formatNumber(estimationResult.hoursRange.max)} hrs range
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Probable price</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums leading-none">
                    ${formatNumber(estimationResult.pricingRange.probable)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ${formatNumber(estimationResult.pricingRange.min)} –{" "}
                    ${formatNumber(estimationResult.pricingRange.max)} range
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ② Scope recap + Calculation breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Scope
                {selectionList.length > 0 && (
                  <span className="ml-1.5 font-normal normal-case">
                    ({selectionList.length} module{selectionList.length !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
              {selectionList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No modules selected.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {selectionList.map((selection) => {
                    const module = modules.find(
                      (entry) => entry.id === selection.moduleId
                    );
                    if (!module) return null;
                    return (
                      <li
                        key={selection.moduleId}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{module.name}</span>
                          {selection.provider && (
                            <span className="text-xs text-muted-foreground">
                              {selection.provider}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {selection.complexity}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-foreground/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Calculation
              </p>
              {!estimationResult ? (
                <p className="text-sm text-muted-foreground">
                  Complete step 1 to view breakdown.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base scope points</span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.baseScopePoints)} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">
                      Risk: {riskLevel}
                    </span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.riskMultiplier, 2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">
                      Urgency: {urgencyLevel}
                    </span>
                    <span className="font-semibold">
                      {formatNumber(estimationResult.urgencyMultiplier, 2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hourly rate</span>
                    <span className="font-semibold">
                      ${formatNumber(hourlyRate, 0)}/hr
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Min hours</span>
                      <span className="font-semibold">
                        {formatNumber(estimationResult.hoursRange.min)} hrs
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Max hours</span>
                      <span className="font-semibold">
                        {formatNumber(estimationResult.hoursRange.max)} hrs
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ③ Save action — full width, prominent */}
          {estimationResult && (
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                className="w-full"
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
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-950/40 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-300">
                    {isEditMode ? "Estimation updated." : "Estimation saved."}
                  </p>
                  <Link
                    href={`/estimations/${savedId}`}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    View →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ④ Client summary, advisor, template */}
          {estimationResult && estimationInput && (
            <>
              <ClientSummaryPanel
                summary={generateClientSummary({
                  input: estimationInput,
                  result: estimationResult,
                  modules,
                })}
                estimationInput={estimationInput}
                estimationResult={estimationResult}
                advisorContent={advisorContent}
                onSummaryTextChange={setSummaryMarkdown}
              />
              <ScopeAdvisorPanel
                estimationInput={estimationInput}
                onAnalysisChange={setAdvisorContent}
                onAddToTemplate={(items) => {
                  setTemplateItems((current) => {
                    const next = new Set([...current, ...items]);
                    return Array.from(next);
                  });
                }}
              />
              {canGenerateTemplate && (
                <ScopeTemplatePanel
                  estimationInput={estimationInput}
                  templateItems={templateItems}
                  summaryMarkdown={summaryMarkdown}
                  onRemoveItem={(item) =>
                    setTemplateItems((current) =>
                      current.filter((entry) => entry !== item)
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-[#00ACFF]">{step}</span>
          <span>/</span>
          <span>3</span>
          <span className="ml-1 hidden sm:inline">&mdash; {STEP_LABELS[step]}</span>
        </div>
        <div className="flex items-center gap-3">
          {isEditMode && estimationId && (
            <Button asChild variant="outline">
              <Link href={`/estimations/${estimationId}`}>Cancel</Link>
            </Button>
          )}
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
