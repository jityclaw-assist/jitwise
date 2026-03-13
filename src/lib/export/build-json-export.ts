import type { ClientSummary } from "@/lib/summary/generate-client-summary";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";

export type EstimationJsonExport = {
  version: "1";
  exportedAt: string;
  estimationId: string;
  createdAt: string;
  input: EstimationInput;
  result: EstimationResult;
  clientSummary: ClientSummary;
};

export function buildJsonExport({
  estimationId,
  createdAt,
  input,
  result,
  clientSummary,
}: {
  estimationId: string;
  createdAt: string;
  input: EstimationInput;
  result: EstimationResult;
  clientSummary: ClientSummary;
}): EstimationJsonExport {
  return {
    version: "1",
    exportedAt: new Date().toISOString(),
    estimationId,
    createdAt,
    input,
    result,
    clientSummary,
  };
}
