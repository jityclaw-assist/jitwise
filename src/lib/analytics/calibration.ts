import { MODULE_CATALOG } from "@/lib/catalog/modules";

type EstimationForCalibration = {
  id: string;
  input: {
    modules: { moduleId: string; complexity: string }[];
  };
  result: {
    baseScopePoints: number;
    hoursRange: { probable: number };
  };
};

type OutcomeForCalibration = {
  estimation_id: string;
  actual_hours: number | null;
};

export type ModuleCalibrationHint = {
  moduleId: string;
  complexity: string;
  avgDeltaPct: number;
  sampleSize: number;
};

/**
 * Returns calibration hints keyed by `${moduleId}:${complexity}` for
 * module+complexity combos with sampleSize >= minSampleSize.
 */
export function computeCalibrationHints(
  estimations: EstimationForCalibration[],
  outcomes: OutcomeForCalibration[],
  minSampleSize = 3
): Map<string, ModuleCalibrationHint> {
  const estimationById = new Map(estimations.map((e) => [e.id, e]));

  // Accumulate deltas per moduleId:complexity
  const accumulator = new Map<
    string,
    { deltas: number[]; complexity: string; moduleId: string }
  >();

  for (const outcome of outcomes) {
    if (outcome.actual_hours === null) continue;
    const est = estimationById.get(outcome.estimation_id);
    if (!est) continue;

    for (const selection of est.input.modules) {
      const module = MODULE_CATALOG.find((m) => m.id === selection.moduleId);
      if (!module) continue;
      const complexityEntry = module.complexity.find(
        (c) => c.level === selection.complexity
      );
      if (!complexityEntry) continue;

      const ratio =
        est.result.baseScopePoints > 0
          ? complexityEntry.points / est.result.baseScopePoints
          : 0;
      const estimatedHrs = ratio * est.result.hoursRange.probable;
      const actualHrs = ratio * outcome.actual_hours;
      const delta = actualHrs - estimatedHrs;

      const key = `${selection.moduleId}:${selection.complexity}`;
      const entry = accumulator.get(key) ?? {
        deltas: [],
        complexity: selection.complexity,
        moduleId: selection.moduleId,
      };
      entry.deltas.push(delta);
      accumulator.set(key, entry);
    }
  }

  const result = new Map<string, ModuleCalibrationHint>();

  for (const [key, { deltas, complexity, moduleId }] of accumulator.entries()) {
    if (deltas.length < minSampleSize) continue;
    const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;

    // Compute avg estimated hours for this module:complexity as denominator
    const module = MODULE_CATALOG.find((m) => m.id === moduleId);
    const complexityEntry = module?.complexity.find((c) => c.level === complexity);
    // Use a rough % based on how many hrs this module typically represents
    // Since actual estimatedHrs vary per project, use the average delta percentage
    // relative to the average estimated hours across outcomes
    const avgEstimated = (() => {
      let sum = 0;
      let count = 0;
      for (const outcome of outcomes) {
        if (outcome.actual_hours === null) continue;
        const est = estimationById.get(outcome.estimation_id);
        if (!est) continue;
        const sel = est.input.modules.find(
          (m) => m.moduleId === moduleId && m.complexity === complexity
        );
        if (!sel) continue;
        const pts = complexityEntry?.points ?? 0;
        const ratio = est.result.baseScopePoints > 0 ? pts / est.result.baseScopePoints : 0;
        sum += ratio * est.result.hoursRange.probable;
        count++;
      }
      return count > 0 ? sum / count : 0;
    })();

    const avgDeltaPct = avgEstimated > 0 ? (avgDelta / avgEstimated) * 100 : 0;

    result.set(key, {
      moduleId,
      complexity,
      avgDeltaPct,
      sampleSize: deltas.length,
    });
  }

  return result;
}
