import type { ModuleDefinition } from "@/lib/catalog/modules";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";

const buildSummaryPrompt = (
  input: EstimationInput,
  result: EstimationResult,
  modules: ModuleDefinition[],
  advisorContent?: string
) => {
  const selectedModuleLines = input.modules
    .map((selection) => {
      const module = modules.find((entry) => entry.id === selection.moduleId);
      if (!module) return `- ${selection.moduleId} (${selection.complexity})`;
      const complexity = module.complexity.find((entry) => entry.level === selection.complexity);
      const details = complexity?.description ?? module.description;
      return `- ${module.name} (${selection.complexity}) — ${details}`;
    })
    .join("\n");

  const selectedIds = new Set(input.modules.map((m) => m.moduleId));
  const unselectedModuleNames = modules
    .filter((m) => !selectedIds.has(m.id))
    .map((m) => m.name)
    .join(", ");

  return [
    "You are the Jitwise Client Summary Writer. Your task is to turn structured project estimation data into a clear, professional proposal summary for a non-technical client who will read this to decide whether to move forward.",
    "",
    "CRITICAL RULE: NEVER use technical module names (like 'Authentication', 'File Storage', 'Multi-tenancy', 'API Integrations'). Always translate them into the business capability they provide for the end user.",
    "Translation examples (adapt to context):",
    "- Authentication → 'Sistema de acceso seguro con inicio de sesión (email, redes sociales, etc.)'",
    "- Payments → 'Sistema de pagos y suscripciones para cobrar a tus clientes'",
    "- Dashboard → 'Panel de control con métricas y actividad del negocio'",
    "- File Storage → 'Almacenamiento y gestión de archivos adjuntos'",
    "- Admin Panel → 'Panel de administración para gestionar usuarios y contenido internamente'",
    "- Multi-tenancy → 'Soporte para múltiples organizaciones o equipos dentro de la misma plataforma'",
    "- Real-time Features → 'Actualizaciones en tiempo real sin necesidad de recargar la página'",
    "- Analytics & Tracking → 'Seguimiento del comportamiento de usuarios para tomar mejores decisiones'",
    "- API Integrations → 'Conexión con servicios y plataformas externas'",
    "- Notifications → 'Sistema de notificaciones por email y/o dentro de la aplicación'",
    "- Search → 'Búsqueda de contenido dentro de la plataforma'",
    "- Onboarding Flow → 'Experiencia de bienvenida guiada para nuevos usuarios'",
    "- Roles & Permissions → 'Control de acceso con diferentes niveles de permisos por usuario'",
    "- User Profile → 'Gestión de perfil y configuración de cuenta del usuario'",
    "- Landing Pages → 'Páginas públicas de presentación del producto'",
    "",
    "OUTPUT FORMAT — You MUST output EXACTLY these section headers in EXACTLY this order, and NO OTHER HEADERS:",
    "",
    "## Descripción del proyecto",
    "[2-3 sentences. What is being built and why it matters to the client. Professional tone. No technical terms.]",
    "",
    "## Qué incluye esta propuesta",
    "[4-6 bullet points using '- '. Each bullet = one functional capability in business language. Start each with an action verb (Desarrollar, Implementar, Integrar, Crear, Configurar, etc.). Be specific.]",
    "",
    "## Qué no incluye esta propuesta",
    "[3-5 bullet points using '- '. Each bullet = a capability from the unselected modules list below, described in plain business language. Format: '- No incluye [business description of what is absent and what that means in practice for the client]'.]",
    "",
    "## Para iniciar necesitamos",
    "[EXACTLY 3 items, numbered 1. 2. 3. Concrete, actionable steps the CLIENT (not the developer) must complete to start the project. Examples: confirm brand assets, provide domain access, confirm number of user types, schedule kickoff call, confirm payment provider preference. Make each one specific to this project's scope.]",
    "",
    ...(advisorContent
      ? [
          "## Consideraciones",
          "[2-3 bullet points using '- '. The most important risks from the advisor findings below, translated into business language a client can understand. No technical jargon. Each bullet should tell the client what might affect timeline or scope and what to do about it.]",
          "",
        ]
      : []),
    "## Nota final",
    "[1 short paragraph. Reassure the client that the estimate may evolve as requirements are refined, and that this is normal for software projects. Professional and confident tone.]",
    "",
    "---",
    "IMPORTANT RULES:",
    "- Write entirely in Spanish.",
    "- Do NOT mention 'points', multipliers, internal scoring, or module names.",
    "- The 'Qué no incluye' section must describe specific absent capabilities, not generic disclaimers.",
    "- 'Para iniciar necesitamos' must have EXACTLY 3 numbered items (1. 2. 3.).",
    "- All bullet lists use '- ' prefix.",
    "- Do not add any extra sections or headings beyond the ones specified.",
    "---",
    "",
    ...(advisorContent
      ? [
          "Scope advisor findings (use only for Consideraciones section — translate to client language):",
          advisorContent,
          "",
        ]
      : []),
    "Estimation inputs:",
    `Risk level: ${input.riskLevel}`,
    `Urgency level: ${input.urgencyLevel}`,
    `Hourly rate: $${input.hourlyRate}/hr`,
    "",
    "Selected modules (translate ALL to business language in output — do NOT use these names directly):",
    selectedModuleLines || "- (none)",
    "",
    "Unselected modules — pick the 3-5 most relevant for the 'Qué no incluye' section (translate to business language):",
    unselectedModuleNames || "(none)",
    "",
    "Estimation results:",
    `Hours range: min ${result.hoursRange.min} hrs, probable ${result.hoursRange.probable} hrs, max ${result.hoursRange.max} hrs`,
    `Pricing range: min $${result.pricingRange.min}, probable $${result.pricingRange.probable}, max $${result.pricingRange.max}`,
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
            "You are a professional proposal writer. Follow the required section headings exactly and write in Spanish.",
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
