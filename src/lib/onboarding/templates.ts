import type { EstimationInput } from "@/lib/schema/estimation";

export type ProjectType = "saas" | "mobile" | "marketplace" | "corporate" | "internal";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  saas: "SaaS",
  mobile: "Mobile App",
  marketplace: "Marketplace",
  corporate: "Corporate Web",
  internal: "Internal Tool",
};

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  saas: "☁️",
  mobile: "📱",
  marketplace: "🛒",
  corporate: "🌐",
  internal: "🔧",
};

export const ONBOARDING_TEMPLATES: Record<
  ProjectType,
  Pick<EstimationInput, "modules" | "riskLevel" | "urgencyLevel">
> = {
  saas: {
    modules: [
      { moduleId: "authentication", complexity: "standard" },
      { moduleId: "user-profile", complexity: "standard" },
      { moduleId: "dashboard", complexity: "standard" },
      { moduleId: "payments", complexity: "standard" },
      { moduleId: "notifications", complexity: "low" },
    ],
    riskLevel: "medium",
    urgencyLevel: "normal",
  },
  mobile: {
    modules: [
      { moduleId: "authentication", complexity: "standard" },
      { moduleId: "onboarding-flow", complexity: "standard" },
      { moduleId: "user-profile", complexity: "low" },
      { moduleId: "file-storage", complexity: "low" },
      { moduleId: "notifications", complexity: "standard" },
    ],
    riskLevel: "medium",
    urgencyLevel: "normal",
  },
  marketplace: {
    modules: [
      { moduleId: "authentication", complexity: "high" },
      { moduleId: "payments", complexity: "high" },
      { moduleId: "search", complexity: "standard" },
      { moduleId: "dashboard", complexity: "standard" },
      { moduleId: "user-profile", complexity: "standard" },
      { moduleId: "roles-permissions", complexity: "standard" },
    ],
    riskLevel: "high",
    urgencyLevel: "normal",
  },
  corporate: {
    modules: [
      { moduleId: "landing-pages", complexity: "standard" },
      { moduleId: "analytics-tracking", complexity: "low" },
      { moduleId: "admin-panel", complexity: "low" },
    ],
    riskLevel: "low",
    urgencyLevel: "normal",
  },
  internal: {
    modules: [
      { moduleId: "admin-panel", complexity: "standard" },
      { moduleId: "roles-permissions", complexity: "standard" },
      { moduleId: "dashboard", complexity: "standard" },
      { moduleId: "api-integrations", complexity: "standard" },
    ],
    riskLevel: "medium",
    urgencyLevel: "normal",
  },
};
