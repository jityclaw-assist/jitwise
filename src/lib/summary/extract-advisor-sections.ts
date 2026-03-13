export type AdvisorInsights = {
  risks: string[];
  questions: string[];
};

type SectionType = "risk" | "question" | "skip";

function classifySection(heading: string): SectionType {
  const lower = heading.toLowerCase();
  if (/question|clarif/.test(lower)) return "question";
  if (/complexit|integrat|infrastructure|operational/.test(lower)) return "risk";
  return "skip";
}

function isHeading(line: string): boolean {
  return (
    /^#{1,4}\s/.test(line) ||
    /^\*\*\d+\./.test(line) ||
    /^\d+\.\s+[A-Z]/.test(line)
  );
}

export function extractAdvisorInsights(content: string): AdvisorInsights {
  const lines = content.split(/\r?\n/);
  const risks: string[] = [];
  const questions: string[] = [];
  let currentSection: SectionType = "skip";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (isHeading(line)) {
      currentSection = classifySection(line);
      continue;
    }

    if (currentSection === "skip") continue;

    if (/^[-*]\s+/.test(line)) {
      const bullet = line.replace(/^[-*]\s+/, "").trim();
      if (!bullet) continue;
      if (currentSection === "risk") risks.push(bullet);
      else if (currentSection === "question") questions.push(bullet);
    }
  }

  return { risks, questions };
}

export function buildAdvisorMarkdownAppendix(insights: AdvisorInsights): string {
  const lines: string[] = [];

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

  return lines.join("\n");
}
