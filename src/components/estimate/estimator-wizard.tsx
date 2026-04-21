"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { ScopeAdvisorPanel } from "@/components/estimate/scope-advisor-panel";
import { ScopeTemplatePanel } from "@/components/estimate/scope-template-panel";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import type { ModuleCalibrationHint } from "@/lib/analytics/calibration";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import type { ModuleCategory, ModuleDefinition } from "@/lib/catalog/modules";
import {
  ONBOARDING_TEMPLATES,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/onboarding/templates";
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
  initialAdvisorContent?: string;
  initialSummaryMarkdown?: string;
  initialTemplateContent?: string;
  initialDocumentTitles?: string[];
  calibrationHints?: Map<string, ModuleCalibrationHint>;
  preset?: ProjectType;
  initialHourlyRate?: number;
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
  initialAdvisorContent,
  initialSummaryMarkdown,
  initialTemplateContent,
  initialDocumentTitles,
  calibrationHints,
  preset,
  initialHourlyRate,
}: EstimatorWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [presetBannerDismissed, setPresetBannerDismissed] = useState(false);

  const [selectedModules, setSelectedModules] = useState<
    Record<string, ModuleState>
  >(() => {
    // Preset takes priority when no initialInput is provided
    if (!initialInput && preset) {
      const template = ONBOARDING_TEMPLATES[preset];
      return Object.fromEntries(
        template.modules.map((item) => {
          const catalogModule = modules.find((m) => m.id === item.moduleId);
          return [
            item.moduleId,
            {
              complexity: item.complexity as ComplexityLevel,
              provider: catalogModule?.providers?.[0],
            },
          ];
        })
      );
    }
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
    initialInput?.hourlyRate ?? initialHourlyRate ?? DEFAULT_HOURLY_RATE
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(
    estimationId ?? null
  );
  const [templateItems, setTemplateItems] = useState<string[]>([]);
  const [summaryMarkdown, setSummaryMarkdown] = useState<string>(initialSummaryMarkdown ?? "");
  const [advisorContent, setAdvisorContent] = useState<string>(initialAdvisorContent ?? "");
  const [templateContent, setTemplateContent] = useState<string>(initialTemplateContent ?? "");
  const [projectContext, setProjectContext] = useState<{
    type: string;
    stack: string;
    teamSize: string;
    phase: string;
    notes: string;
  }>({ type: "", stack: "", teamSize: "", phase: "", notes: "" });
  type OutputTab = "breakdown" | "client" | "advisor" | "template";
  const [outputTab, setOutputTab] = useState<OutputTab>("breakdown");

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

  const moduleBreakdown = useMemo(() => {
    if (!estimationResult || selectionList.length === 0) return [];
    const { baseScopePoints, hoursRange, pricingRange } = estimationResult;
    return selectionList
      .map((selection) => {
        const module = modules.find((m) => m.id === selection.moduleId);
        const points =
          module?.complexity.find((c) => c.level === selection.complexity)
            ?.points ?? 0;
        const ratio = baseScopePoints > 0 ? points / baseScopePoints : 0;
        return {
          moduleId: selection.moduleId,
          name: module?.name ?? selection.moduleId,
          complexity: selection.complexity,
          provider: selection.provider,
          points,
          pct: Math.round(ratio * 100),
          hoursProbable: Math.round(ratio * hoursRange.probable * 10) / 10,
          hoursMin: Math.round(ratio * hoursRange.min * 10) / 10,
          hoursMax: Math.round(ratio * hoursRange.max * 10) / 10,
          costProbable: Math.round(ratio * pricingRange.probable),
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [selectionList, estimationResult, modules]);

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
          body: JSON.stringify({
            input: estimationInput,
            advisorContent: advisorContent || undefined,
            summaryMarkdown: summaryMarkdown || undefined,
            templateContent: templateContent || undefined,
          }),
        }
      );

      if (response.status === 403) {
        setShowUpgradeModal(true);
        setSaveState("idle");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to save estimation.");
      }

      const data = (await response.json()) as { id?: string };
      setSavedId(data.id ?? estimationId ?? null);
      setSaveState("saved");
      sileo.success({ title: isEditMode ? "Estimation updated." : "Estimation saved." });
    } catch (error) {
      setSaveState("error");
      sileo.error({ title: "Could not save.", description: "Check your session and try again." });
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
          {/* Preset banner */}
          {preset && !presetBannerDismissed && (
            <div className="flex items-start gap-3 rounded-xl border-l-[3px] border-blue-500 bg-blue-500/10 px-4 py-3 text-sm">
              <span className="text-base">✨</span>
              <p className="flex-1 text-blue-300">
                Pre-loaded for <strong>{PROJECT_TYPE_LABELS[preset]}</strong> — customize as needed.
              </p>
              <button
                onClick={() => setPresetBannerDismissed(true)}
                className="shrink-0 text-xs text-blue-400/60 hover:text-blue-300"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {CATEGORY_ORDER.filter((cat) =>
            modules.some((m) => m.category === cat)
          ).map((category) => (
            <div key={category} className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {category}
              </p>
              <div className="grid gap-6 md:grid-cols-2">
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
                      <p className="mt-2 text-xs text-muted-foreground">
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
                      {(() => {
                        if (!isSelected || !calibrationHints) return null;
                        const hint = calibrationHints.get(`${module.id}:${selectedComplexity}`);
                        if (!hint || hint.sampleSize < 3 || hint.avgDeltaPct <= 10) return null;
                        const nextLevel = selectedComplexity === "low" ? "Standard" : "High";
                        return (
                          <p className="mt-0.5 text-[11px] leading-snug text-amber-800 dark:text-amber-400">
                            ⚠ Historically +{Math.round(hint.avgDeltaPct)}% over — consider {nextLevel}
                          </p>
                        );
                      })()}
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

          {/* Project context — optional, enriches AI analysis */}
          <div className="flex flex-col gap-4 rounded-xl border border-border p-4 md:col-span-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Project context
                <span className="ml-2 font-normal normal-case text-muted-foreground/60">
                  — optional, enriches advisor &amp; summary AI
                </span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Project type</label>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={projectContext.type}
                  onChange={(e) => setProjectContext((c) => ({ ...c, type: e.target.value }))}
                >
                  <option value="">Not specified</option>
                  <option value="Greenfield">Greenfield</option>
                  <option value="Brownfield / legacy">Brownfield / legacy</option>
                  <option value="MVP">MVP</option>
                  <option value="Internal tool">Internal tool</option>
                  <option value="Client product">Client product</option>
                  <option value="SaaS">SaaS</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Delivery phase</label>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={projectContext.phase}
                  onChange={(e) => setProjectContext((c) => ({ ...c, phase: e.target.value }))}
                >
                  <option value="">Not specified</option>
                  <option value="Discovery / design">Discovery / design</option>
                  <option value="MVP build">MVP build</option>
                  <option value="Full product">Full product</option>
                  <option value="Iteration / v2">Iteration / v2</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Team size</label>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={projectContext.teamSize}
                  onChange={(e) => setProjectContext((c) => ({ ...c, teamSize: e.target.value }))}
                >
                  <option value="">Not specified</option>
                  <option value="Solo dev">Solo dev</option>
                  <option value="1–2 devs">1–2 devs</option>
                  <option value="3–5 devs">3–5 devs</option>
                  <option value="6+ devs">6+ devs</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Tech stack (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Supabase, Stripe"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                  value={projectContext.stack}
                  onChange={(e) => setProjectContext((c) => ({ ...c, stack: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Additional context (optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client has existing backend, needs mobile-first, strict GDPR requirements..."
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                  value={projectContext.notes}
                  onChange={(e) => setProjectContext((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">

          {/* ① Hero: primary result + save action */}
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Estimate result
            </p>
            {!estimationResult ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Select at least one module in step 1 to see results.
              </p>
            ) : (
              <>
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
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
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
              </>
            )}
          </div>

          {/* ② Tabbed panels */}
          {estimationResult && estimationInput && (
            <div className="flex flex-col gap-0">
              {/* Tab bar */}
              <div className="flex border-b border-border">
                {(
                  [
                    { id: "breakdown", label: "Breakdown" },
                    { id: "client", label: "Client summary" },
                    { id: "advisor", label: "Advisor" },
                    ...(canGenerateTemplate
                      ? [{ id: "template", label: "Template" }]
                      : []),
                  ] as Array<{ id: OutputTab; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOutputTab(tab.id)}
                    className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                      outputTab === tab.id
                        ? "text-foreground after:absolute after:-bottom-px after:left-0 after:right-0 after:h-px after:bg-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content — all panels stay mounted to preserve state; hidden hides inactive ones */}
              <div className="pt-6">
                <div className={outputTab !== "breakdown" ? "hidden" : ""}>
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
                    </div>
                  </div>

                  {/* Per-module effort breakdown */}
                  {moduleBreakdown.length > 0 && (
                    <div className="mt-6 rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Effort by module
                      </p>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground">
                              <th className="pb-2 text-left font-medium">Module</th>
                              <th className="pb-2 text-right font-medium">Pts</th>
                              <th className="pb-2 text-right font-medium">% scope</th>
                              <th className="pb-2 text-right font-medium">Probable hrs</th>
                              <th className="pb-2 text-right font-medium">Range</th>
                              <th className="pb-2 text-right font-medium">Probable cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {moduleBreakdown.map((row) => (
                              <tr key={row.moduleId}>
                                <td className="py-2 pr-4">
                                  <span className="font-medium">{row.name}</span>
                                  {row.provider && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {row.provider}
                                    </span>
                                  )}
                                  <span className="ml-2 text-xs capitalize text-muted-foreground">
                                    · {row.complexity}
                                  </span>
                                </td>
                                <td className="py-2 text-right tabular-nums">{row.points}</td>
                                <td className="py-2 text-right tabular-nums text-muted-foreground">
                                  {row.pct}%
                                </td>
                                <td className="py-2 text-right font-semibold tabular-nums">
                                  {formatNumber(row.hoursProbable)} hrs
                                </td>
                                <td className="py-2 text-right tabular-nums text-muted-foreground">
                                  {formatNumber(row.hoursMin)}–{formatNumber(row.hoursMax)}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  ${formatNumber(row.costProbable, 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className={outputTab !== "client" ? "hidden" : ""}>
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
                    initialGeneratedText={initialSummaryMarkdown}
                  />
                </div>

                <div className={outputTab !== "advisor" ? "hidden" : ""}>
                  <ScopeAdvisorPanel
                    estimationInput={estimationInput}
                    projectContext={projectContext}
                    documentTitles={initialDocumentTitles}
                    onAnalysisChange={setAdvisorContent}
                    onAddToTemplate={(items) => {
                      setTemplateItems((current) => {
                        const next = new Set([...current, ...items]);
                        return Array.from(next);
                      });
                    }}
                  />
                </div>

                {canGenerateTemplate && (
                  <div className={outputTab !== "template" ? "hidden" : ""}>
                    <ScopeTemplatePanel
                      estimationInput={estimationInput}
                      templateItems={templateItems}
                      summaryMarkdown={summaryMarkdown}
                      advisorContent={advisorContent}
                      onTemplateChange={setTemplateContent}
                      onRemoveItem={(item) =>
                        setTemplateItems((current) =>
                          current.filter((entry) => entry !== item)
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
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

      {showUpgradeModal && (
        <UpgradeModal feature="estimations" onClose={() => setShowUpgradeModal(false)} />
      )}
    </section>
  );
}
