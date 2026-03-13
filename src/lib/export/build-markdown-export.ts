import type { ClientSummary } from "@/lib/summary/generate-client-summary";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

export function buildMarkdownExport({
  estimationId,
  createdAt,
  hourlyRate,
  clientSummary,
}: {
  estimationId: string;
  createdAt: string;
  hourlyRate: number;
  clientSummary: ClientSummary;
}): string {
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [];

  lines.push(`# Jitwise Estimation — ${date}`);
  lines.push("");
  lines.push(`**Estimation ID:** ${estimationId}`);
  lines.push(`**Created:** ${date}`);
  lines.push(`**Hourly rate:** $${formatNumber(hourlyRate)}`);
  lines.push("");

  lines.push("## Scope");
  lines.push("");
  lines.push("| Module | Complexity | Points |");
  lines.push("|--------|------------|--------|");
  clientSummary.scope.forEach((item) => {
    lines.push(`| ${item.name} | ${item.complexity} | ${item.points} |`);
  });
  lines.push("");

  lines.push("## Estimates");
  lines.push("");
  lines.push(
    `**Effort:** ${formatNumber(clientSummary.hoursRange.min)}–${formatNumber(clientSummary.hoursRange.max)} hrs (probable ${formatNumber(clientSummary.hoursRange.probable)})`
  );
  lines.push(
    `**Pricing:** $${formatNumber(clientSummary.pricingRange.min)}–$${formatNumber(clientSummary.pricingRange.max)} (probable $${formatNumber(clientSummary.pricingRange.probable)})`
  );
  lines.push("");

  lines.push("## Risk & Urgency");
  lines.push("");
  lines.push(`- Risk: ${clientSummary.risk.level} — ${clientSummary.risk.note}`);
  lines.push(`- Urgency: ${clientSummary.urgency.level} — ${clientSummary.urgency.note}`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(clientSummary.summaryText);

  const insights = clientSummary.advisorInsights;
  if (insights && (insights.risks.length > 0 || insights.questions.length > 0)) {
    lines.push("");
    lines.push("---");
    lines.push("");
    if (insights.risks.length > 0) {
      lines.push("## Risk Factors & Complexity");
      lines.push("");
      insights.risks.forEach((r) => lines.push(`- ${r}`));
      lines.push("");
    }
    if (insights.questions.length > 0) {
      lines.push("## Open Questions");
      lines.push("");
      insights.questions.forEach((q) => lines.push(`- ${q}`));
      lines.push("");
    }
  }

  return lines.join("\n");
}
