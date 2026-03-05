import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type {
  EstimationInput,
  EstimationRange,
  EstimationResult,
  ComplexityLevel,
  RiskLevel,
  UrgencyLevel,
} from "@/lib/schema/estimation";

const RISK_MULTIPLIERS: Record<RiskLevel, number> = {
  low: 1,
  medium: 1.15,
  high: 1.3,
};

const URGENCY_MULTIPLIERS: Record<UrgencyLevel, number> = {
  normal: 1,
  expedite: 1.2,
  rush: 1.4,
};

const HOURS_PER_POINT: EstimationRange = {
  min: 1.5,
  probable: 2.5,
  max: 4,
};

const roundToTenth = (value: number): number =>
  Math.round(value * 10) / 10;

const resolveModulePoints = (
  moduleId: string,
  complexity: ComplexityLevel
): number => {
  const module = MODULE_CATALOG.find((item) => item.id === moduleId);
  if (!module) {
    throw new Error(`Unknown module: ${moduleId}`);
  }

  const option = module.complexity.find(
    (entry) => entry.level === complexity
  );
  if (!option) {
    throw new Error(
      `Unknown complexity level: ${complexity} for module ${moduleId}`
    );
  }

  return option.points;
};

export const calculateEstimation = (
  input: EstimationInput
): EstimationResult => {
  const baseScopePoints = input.modules.reduce((total, selection) => {
    return total + resolveModulePoints(selection.moduleId, selection.complexity);
  }, 0);

  const riskMultiplier = RISK_MULTIPLIERS[input.riskLevel];
  const urgencyMultiplier = URGENCY_MULTIPLIERS[input.urgencyLevel];
  const totalMultiplier = riskMultiplier * urgencyMultiplier;

  const hoursRange: EstimationRange = {
    min: roundToTenth(baseScopePoints * HOURS_PER_POINT.min * totalMultiplier),
    probable: roundToTenth(
      baseScopePoints * HOURS_PER_POINT.probable * totalMultiplier
    ),
    max: roundToTenth(baseScopePoints * HOURS_PER_POINT.max * totalMultiplier),
  };

  const pricingRange: EstimationRange = {
    min: roundToTenth(hoursRange.min * input.hourlyRate),
    probable: roundToTenth(hoursRange.probable * input.hourlyRate),
    max: roundToTenth(hoursRange.max * input.hourlyRate),
  };

  return {
    baseScopePoints,
    riskMultiplier,
    urgencyMultiplier,
    hoursRange,
    pricingRange,
  };
};
