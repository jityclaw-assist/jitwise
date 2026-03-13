import type { ModuleDefinition } from "@/lib/catalog/modules";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";

const buildSummaryPrompt = (
  input: EstimationInput,
  result: EstimationResult,
  modules: ModuleDefinition[],
  advisorContent?: string
) => {
  const moduleLines = input.modules
    .map((selection) => {
      const module = modules.find((entry) => entry.id === selection.moduleId);
      if (!module) {
        return `- ${selection.moduleId} (${selection.complexity})`;
      }
      const complexity = module.complexity.find(
        (entry) => entry.level === selection.complexity
      );
      const details = complexity?.description ?? module.description;
      return `- ${module.name} (${selection.complexity}) — ${details}`;
    })
    .join("\n");

  return [
    "You are the Jitwise Client Summary Interpreter. Your task is to turn structured project estimation data from the Jitwise framework into a concise, clear, and professional project summary for the client. Your role is to translate, not invent: do NOT change the estimate, create new pricing, or add features not in the supplied modules. Base all explanations strictly and fully on the provided data.",
    "",
    "The input you receive always consists of:",
    "- List of selected modules",
    "- Their relative complexity levels",
    "- Total scope points (do NOT mention \"points\" in output)",
    "- Estimated effort range",
    "- Estimated pricing range",
    "- Risk or uncertainty indicators",
    "",
    "Your objective is to provide an easily understandable summary that addresses:",
    "- What the project will cover",
    "- Why time and cost are estimated as ranges",
    "- What functionality or technical requirements add complexity",
    "- Where uncertainty or scope change is possible",
    "",
    "Guidelines:",
    "- Use a professional, neutral, and transparent tone",
    "- Avoid technical/developer jargon, marketing language, exaggerated claims, or speculative/unsupported features",
    "- Frame risk or uncertainty as typical for software projects",
    "- Explain functional scope and engineering effort in plain language",
    "- Do NOT mention internal scoring systems like \"points\" anywhere",
    "",
    "Your response must follow this exact structure:",
    "",
    "PROJECT OVERVIEW",
    "[Brief explanation of what the project includes.]",
    "",
    "SCOPE BREAKDOWN",
    "[Describe the main functional areas, in plain language, without jargon.]",
    "",
    "ESTIMATED EFFORT",
    "[Explain why the estimate is a range and what influences that range.]",
    "",
    "COMPLEXITY DRIVERS",
    "[Identify which functional areas contribute most to the estimate and why.]",
    "",
    "RISK CONSIDERATIONS",
    "[Summarize major potential uncertainties or sources of change.]",
    "",
    "FINAL NOTE",
    "[Remind the client the estimate may evolve as requirements become clearer.]",
    "",
    "Never invent or assume scope details not present in the provided input.",
    "",
    "Output format:",
    "- Full response in sections, as described above",
    "- Use clear section headers",
    "- Length: 1-2 well-structured paragraphs per required section",
    "",
    "Important:",
    "- Always reason step-by-step, turning the structured input data into each section before writing your final output.",
    "- Never start by stating a conclusion; first process and interpret all inputs and note reasoning per section, then present the final formatted summary.",
    "",
    "REMEMBER: Your main objectives are to translate estimation data for client clarity, maintain professional neutrality, and strictly avoid extrapolating beyond the input provided.",
    "",
    ...(advisorContent
      ? [
          "Scope advisor findings (use these to enrich RISK CONSIDERATIONS, COMPLEXITY DRIVERS, and FINAL NOTE — do not copy them verbatim, translate them into client-facing language):",
          advisorContent,
          "",
        ]
      : []),
    "Inputs:",
    `Risk level: ${input.riskLevel}`,
    `Urgency level: ${input.urgencyLevel}`,
    `Hourly rate: ${input.hourlyRate}`,
    "Selected modules:",
    moduleLines.length > 0 ? moduleLines : "- (none)",
    "",
    "Estimation results:",
    `Hours range: min ${result.hoursRange.min}, probable ${result.hoursRange.probable}, max ${result.hoursRange.max}`,
    `Pricing range: min ${result.pricingRange.min}, probable ${result.pricingRange.probable}, max ${result.pricingRange.max}`,
    `Risk multiplier: ${result.riskMultiplier}`,
    `Urgency multiplier: ${result.urgencyMultiplier}`,
  ].join("\n");
};

export const generateAiClientSummaryMarkdown = async ({
  input,
  result,
  modules = MODULE_CATALOG,
  advisorContent,
}: {
  input: EstimationInput;
  result: EstimationResult;
  modules?: ModuleDefinition[];
  advisorContent?: string;
}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    throw new Error("Missing OpenAI configuration.");
  }

  const prompt = buildSummaryPrompt(input, result, modules, advisorContent);

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
            "You are a precise technical writer. Follow the required section headings.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";

  return content.trim();
};
