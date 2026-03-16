export type ParsedSections = {
  included: string[];
  excluded: string[];
  nextSteps: string[];
  freeMarkdown: string;
  hasStructuredSections: boolean;
};

const STRUCTURED_HEADINGS = new Set([
  "## Qué incluye esta propuesta",
  "## Qué no incluye esta propuesta",
  "## Para iniciar necesitamos",
]);

function extractBullets(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function extractNumbered(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

export function parseStructuredSummary(markdown: string): ParsedSections {
  const lines = markdown.split(/\r?\n/);
  const sectionLines: Record<string, string[]> = {};
  let currentStructured: string | null = null;
  const freeLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (STRUCTURED_HEADINGS.has(trimmed)) {
      currentStructured = trimmed;
      sectionLines[trimmed] = [];
    } else if (/^#{1,4}\s/.test(trimmed)) {
      // Any other heading closes the structured section
      currentStructured = null;
      freeLines.push(line);
    } else if (currentStructured !== null) {
      sectionLines[currentStructured].push(line);
    } else {
      freeLines.push(line);
    }
  }

  const includedLines = sectionLines["## Qué incluye esta propuesta"] ?? [];
  const excludedLines = sectionLines["## Qué no incluye esta propuesta"] ?? [];
  const nextStepsLines = sectionLines["## Para iniciar necesitamos"] ?? [];

  const included = extractBullets(includedLines);
  const excluded = extractBullets(excludedLines);
  const nextSteps = [
    ...extractNumbered(nextStepsLines),
    ...extractBullets(nextStepsLines),
  ].slice(0, 3);

  const hasStructuredSections =
    included.length > 0 || excluded.length > 0 || nextSteps.length > 0;

  return {
    included,
    excluded,
    nextSteps,
    freeMarkdown: freeLines.join("\n").trim(),
    hasStructuredSections,
  };
}

export function buildPlainTextSummary(sections: ParsedSections): string {
  const parts: string[] = [];

  if (sections.included.length > 0) {
    parts.push("QUÉ INCLUYE ESTA PROPUESTA");
    sections.included.forEach((item) => parts.push(`• ${item}`));
    parts.push("");
  }

  if (sections.excluded.length > 0) {
    parts.push("QUÉ NO INCLUYE ESTA PROPUESTA");
    sections.excluded.forEach((item) => parts.push(`• ${item}`));
    parts.push("");
  }

  if (sections.nextSteps.length > 0) {
    parts.push("PARA INICIAR NECESITAMOS");
    sections.nextSteps.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
    parts.push("");
  }

  if (sections.freeMarkdown) {
    // Strip markdown syntax for plain text copy
    const plain = sections.freeMarkdown
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^[-*]\s+/gm, "• ")
      .trim();
    parts.push(plain);
  }

  return parts.join("\n").trim();
}
