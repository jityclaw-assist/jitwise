import { computeCalibrationHints, type ModuleCalibrationHint } from "@/lib/analytics/calibration";
import { EstimatorWizard } from "@/components/estimate/estimator-wizard";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import {
  ONBOARDING_TEMPLATES,
  type ProjectType,
} from "@/lib/onboarding/templates";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export default async function EstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; rate?: string }>;
}) {
  const auth = await getAuthenticatedSupabase();
  const { preset: presetParam, rate: rateParam } = await searchParams;

  const preset =
    presetParam &&
    Object.keys(ONBOARDING_TEMPLATES).includes(presetParam)
      ? (presetParam as ProjectType)
      : undefined;

  const presetRate = rateParam ? Number(rateParam) : undefined;
  const initialRate =
    presetRate && !Number.isNaN(presetRate) && presetRate > 0
      ? presetRate
      : undefined;

  let calibrationHints: Map<string, ModuleCalibrationHint> | undefined;

  if (auth) {
    const { supabase, user } = auth;
    const [{ data: estimations }, { data: outcomes }] = await Promise.all([
      supabase
        .from("estimations")
        .select("id, input, result")
        .eq("user_id", user.id),
      supabase
        .from("estimation_outcomes")
        .select("estimation_id, actual_hours")
        .eq("user_id", user.id),
    ]);
    calibrationHints = computeCalibrationHints(estimations ?? [], outcomes ?? []);
  }

  return (
    <main className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Estimation
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Build a defensible estimate
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Select scope modules, define risk and urgency, and review a structured
            effort and pricing range.
          </p>
        </div>
      </header>
      <EstimatorWizard
        modules={MODULE_CATALOG}
        calibrationHints={calibrationHints}
        preset={preset}
        initialHourlyRate={initialRate}
      />
    </main>
  );
}
