import { MODULE_CATALOG, type ModuleDefinition } from "@/lib/catalog/modules";
import type {
  EstimationInput,
  EstimationRange,
  EstimationResult,
  RiskLevel,
  UrgencyLevel,
} from "@/lib/schema/estimation";

export type ClientSummaryScopeItem = {
  moduleId: string;
  name: string;
  complexity: string;
  description: string;
  points: number;
};

export type ClientSummary = {
  scope: ClientSummaryScopeItem[];
  baseScopePoints: number;
  risk: {
    level: RiskLevel;
    multiplier: number;
    note: string;
  };
  urgency: {
    level: UrgencyLevel;
    multiplier: number;
    note: string;
  };
  hoursRange: EstimationRange;
  pricingRange: EstimationRange;
  notes: string[];
  summaryText: string;
  advisorInsights?: { risks: string[]; questions: string[] };
  advisorContent?: string;
  templateContent?: string;
};

export type GenerateClientSummaryInput = {
  input: EstimationInput;
  result: EstimationResult;
  modules?: ModuleDefinition[];
};

const RISK_NOTES: Record<RiskLevel, string> = {
  low: "Scope is well defined with minimal open questions.",
  medium: "Some details remain open and may affect schedule or effort.",
  high: "Significant unknowns require discovery before finalizing timing.",
};

const URGENCY_NOTES: Record<UrgencyLevel, string> = {
  normal: "Standard delivery timeline with normal scheduling flexibility.",
  expedite: "Accelerated timeline with less scheduling flexibility.",
  rush: "Aggressive timeline that may require dedicated focus.",
};

const formatNumber = (value: number, fractionDigits = 1) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);

const capitalize = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "Light",
  standard: "Standard",
  high: "Advanced",
};

const resolveComplexityLabel = (value: string) =>
  COMPLEXITY_LABELS[value] ?? capitalize(value);

const formatRange = (range: EstimationRange, unit: string) => {
  const unitSuffix = unit ? ` ${unit}` : "";
  return `${formatNumber(range.min)}-${formatNumber(
    range.max
  )}${unitSuffix} (probable ${formatNumber(range.probable)})`;
};

const formatCurrencyRange = (range: EstimationRange) =>
  `$${formatNumber(range.min)}-$${formatNumber(
    range.max
  )} (probable $${formatNumber(range.probable)})`;

const resolveScopeItems = (
  input: EstimationInput,
  modules: ModuleDefinition[]
): ClientSummaryScopeItem[] => {
  return input.modules.map((selection) => {
    const module = modules.find((entry) => entry.id === selection.moduleId);
    if (!module) {
      return {
        moduleId: selection.moduleId,
        name: selection.moduleId,
        complexity: selection.complexity,
        description: "Custom scope item.",
        points: 0,
      };
    }

    const complexityOption = module.complexity.find(
      (entry) => entry.level === selection.complexity
    );

    return {
      moduleId: module.id,
      name: module.name,
      complexity: selection.complexity,
      description:
        complexityOption?.description ?? module.description,
      points: complexityOption?.points ?? 0,
    };
  });
};

const buildSummaryText = (
  summary: Omit<ClientSummary, "summaryText">
): string => {
  const lines: string[] = [];

  lines.push("## Scope summary");
  summary.scope.forEach((item) => {
    lines.push(
      `- ${item.name} — ${item.description} (${resolveComplexityLabel(
        item.complexity
      )} scope)`
    );
  });

  lines.push("## Timeline and assumptions");
  lines.push(
    `- Risk: ${capitalize(summary.risk.level)} (${summary.risk.note})`
  );
  lines.push(
    `- Urgency: ${capitalize(summary.urgency.level)} (${summary.urgency.note})`
  );

  lines.push("## Estimated ranges");
  lines.push(
    `- Effort: ${formatRange(summary.hoursRange, "hours")}.`
  );
  lines.push(
    `- Pricing: ${formatCurrencyRange(summary.pricingRange)}.`
  );

  if (summary.notes.length > 0) {
    lines.push("## Notes");
    summary.notes.forEach((note) => lines.push(`- ${note}`));
  }

  return lines.join("\n");
};

export const generateClientSummary = ({
  input,
  result,
  modules = MODULE_CATALOG,
}: GenerateClientSummaryInput): ClientSummary => {
  const scope = resolveScopeItems(input, modules);
  const riskNote = RISK_NOTES[input.riskLevel];
  const urgencyNote = URGENCY_NOTES[input.urgencyLevel];

  const summaryBase = {
    scope,
    baseScopePoints: result.baseScopePoints,
    risk: {
      level: input.riskLevel,
      multiplier: result.riskMultiplier,
      note: riskNote,
    },
    urgency: {
      level: input.urgencyLevel,
      multiplier: result.urgencyMultiplier,
      note: urgencyNote,
    },
    hoursRange: result.hoursRange,
    pricingRange: result.pricingRange,
    notes: [
      "This estimate reflects the scope listed above and current assumptions.",
      "Ranges include the selected risk and urgency levels.",
      `Pricing is based on an hourly rate of $${formatNumber(
        input.hourlyRate
      )}.`,
      "Changes to scope, requirements, or timeline may shift the ranges.",
    ],
  };

  return {
    ...summaryBase,
    summaryText: buildSummaryText(summaryBase),
  };
};
