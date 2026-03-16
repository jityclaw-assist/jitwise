import { NextResponse } from "next/server";

import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { EstimationInputSchema } from "@/lib/schema/estimation";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

type AdvisorResponse = {
  content: string;
};

const buildPrompt = (input: {
  modules: { moduleId: string; complexity: string; provider?: string }[];
  riskLevel: string;
  urgencyLevel: string;
  hourlyRate: number;
  projectContext?: {
    type?: string;
    stack?: string;
    teamSize?: string;
    phase?: string;
    notes?: string;
  };
  documentTitles?: string[];
}) => {
  const moduleSections = input.modules
    .map((selection) => {
      const module = MODULE_CATALOG.find((entry) => entry.id === selection.moduleId);
      const name = module?.name ?? selection.moduleId;
      const desc =
        module?.complexity.find((c) => c.level === selection.complexity)?.description ??
        module?.description ??
        "";
      const provider = selection.provider ? ` via ${selection.provider}` : "";
      return `### ${name} (${selection.complexity}${provider})\n${desc}`;
    })
    .join("\n\n");

  const contextLines: string[] = [];
  if (input.projectContext) {
    const c = input.projectContext;
    if (c.type) contextLines.push(`- Project type: ${c.type}`);
    if (c.stack) contextLines.push(`- Tech stack: ${c.stack}`);
    if (c.teamSize) contextLines.push(`- Team size: ${c.teamSize}`);
    if (c.phase) contextLines.push(`- Delivery phase: ${c.phase}`);
    if (c.notes) contextLines.push(`- Additional context: ${c.notes}`);
  }

  const docsLine =
    input.documentTitles && input.documentTitles.length > 0
      ? `\nReferenced project documents: ${input.documentTitles.map((t) => `"${t}"`).join(", ")}`
      : "";

  return [
    "You are the Jitwise Scope Advisor — a senior software architect reviewing a project scope for estimation accuracy and completeness.",
    "",
    "Guidelines:",
    "- Structure your analysis MODULE BY MODULE first, then provide a cross-cutting summary.",
    "- For each module: identify specific risks, missing considerations, and questions relevant to that module.",
    "- Do NOT estimate cost or hours. Do NOT override estimation results.",
    "- Be concise and actionable. No generic advice. No marketing language.",
    "- Reasoning before bullet points in every section.",
    "- If data is missing or ambiguous, state it explicitly.",
    "",
    "Output format (markdown):",
    "",
    "## Module Analysis",
    "",
    "For each selected module, output:",
    "### [Module Name]",
    "- **Missing considerations:** [specific gaps for this module]",
    "- **Technical complexity:** [hidden complexity signals]",
    "- **Integration risks:** [specific integration concerns]",
    "- **Questions:** [targeted clarifying questions for this module]",
    "",
    "## Cross-cutting Concerns",
    "",
    "### Infrastructure & Deployment",
    "[Reasoning + bullets covering concerns that span multiple modules]",
    "",
    "### Operational Concerns",
    "[Reasoning + bullets: monitoring, security, scaling, backups]",
    "",
    "### Top Questions Worth Clarifying",
    "[The most critical open questions across the entire scope, ranked by impact on estimation]",
    "",
    "IMPORTANT: Every module must appear in the analysis even if risks are low.",
    "",
    "Estimation context:",
    `- Risk level: ${input.riskLevel}`,
    `- Urgency level: ${input.urgencyLevel}`,
    `- Hourly rate: $${input.hourlyRate}/hr`,
    contextLines.length > 0 ? contextLines.join("\n") : "",
    docsLine,
    "",
    "Selected modules:",
    moduleSections || "(none)",
  ]
    .filter((l) => l !== null)
    .join("\n");
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    input?: unknown;
    projectContext?: {
      type?: string;
      stack?: string;
      teamSize?: string;
      phase?: string;
      notes?: string;
    };
    documentTitles?: string[];
  };
  const parsedInput = EstimationInputSchema.safeParse(body.input);

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return NextResponse.json(
      {
        error:
          "Missing OpenAI configuration. Set OPENAI_API_KEY and OPENAI_MODEL.",
      },
      { status: 500 }
    );
  }

  const prompt = buildPrompt({
    ...parsedInput.data,
    projectContext: body.projectContext,
    documentTitles: body.documentTitles,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are the Jitwise Scope Advisor. Follow the output format exactly.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "OpenAI request failed.", details: errorText },
      { status: 500 }
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ content });
}
