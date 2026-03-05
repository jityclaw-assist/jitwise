import type { ComplexityLevel } from "@/lib/schema/estimation";

export type ModuleComplexityOption = {
  level: ComplexityLevel;
  points: number;
  description: string;
};

export type ModuleDefinition = {
  id: string;
  name: string;
  description: string;
  provider?: string;
  complexity: ModuleComplexityOption[];
};

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    id: "authentication",
    name: "Authentication",
    description: "User auth flows with Supabase Auth and role-aware access.",
    provider: "Supabase",
    complexity: [
      { level: "low", points: 3, description: "Email/password + basic sessions." },
      { level: "standard", points: 6, description: "OAuth providers + password reset." },
      { level: "high", points: 10, description: "SSO, MFA, and advanced access control." },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    description: "Freemium billing integration and subscription management.",
    provider: "Stripe",
    complexity: [
      { level: "low", points: 4, description: "Single plan + hosted checkout." },
      { level: "standard", points: 8, description: "Multiple tiers + webhooks." },
      { level: "high", points: 13, description: "Usage metering + proration + invoicing." },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "User-facing dashboard with key metrics and activity.",
    complexity: [
      { level: "low", points: 5, description: "Static widgets + basic lists." },
      { level: "standard", points: 9, description: "Interactive filters + charts." },
      { level: "high", points: 14, description: "Real-time data + advanced analytics." },
    ],
  },
  {
    id: "api-integrations",
    name: "API Integrations",
    description: "Third-party API integrations and data synchronization.",
    complexity: [
      { level: "low", points: 4, description: "Single API + one-way sync." },
      { level: "standard", points: 8, description: "Multiple APIs + webhooks." },
      { level: "high", points: 12, description: "Bi-directional sync + conflict handling." },
    ],
  },
  {
    id: "admin-panel",
    name: "Admin Panel",
    description: "Internal admin tooling for managing users and data.",
    complexity: [
      { level: "low", points: 3, description: "Read-only views + basic actions." },
      { level: "standard", points: 6, description: "Moderation workflows + audit log." },
      { level: "high", points: 9, description: "Custom tooling + permissions matrix." },
    ],
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Email and in-app notifications for key events.",
    complexity: [
      { level: "low", points: 2, description: "Single channel + basic templates." },
      { level: "standard", points: 4, description: "Multiple channels + preferences." },
      { level: "high", points: 7, description: "Triggered workflows + digests." },
    ],
  },
];
