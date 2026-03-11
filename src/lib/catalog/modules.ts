import type { ComplexityLevel } from "@/lib/schema/estimation";

export type ModuleComplexityOption = {
  level: ComplexityLevel;
  points: number;
  description: string;
};

export type ModuleCategory =
  | "Core"
  | "Commerce"
  | "Data"
  | "Infrastructure"
  | "Internal";

export type ModuleDefinition = {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  providers?: string[];
  complexity: ModuleComplexityOption[];
};

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    id: "authentication",
    name: "Authentication",
    category: "Core",
    description: "User auth flows with role-aware access control.",
    providers: ["Supabase", "Auth0", "NextAuth.js", "Firebase"],
    complexity: [
      { level: "low", points: 3, description: "Email/password + basic sessions." },
      { level: "standard", points: 6, description: "OAuth providers + password reset." },
      { level: "high", points: 10, description: "SSO, MFA, and advanced access control." },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    category: "Commerce",
    description: "Billing integration and subscription management.",
    providers: ["Stripe", "LemonSqueezy", "Paddle"],
    complexity: [
      { level: "low", points: 4, description: "Single plan + hosted checkout." },
      { level: "standard", points: 8, description: "Multiple tiers + webhooks." },
      { level: "high", points: 13, description: "Usage metering + proration + invoicing." },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    category: "Data",
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
    category: "Infrastructure",
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
    category: "Internal",
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
    category: "Infrastructure",
    description: "Email and in-app notifications for key events.",
    providers: ["Resend", "SendGrid", "Twilio", "In-app only"],
    complexity: [
      { level: "low", points: 2, description: "Single channel + basic templates." },
      { level: "standard", points: 4, description: "Multiple channels + preferences." },
      { level: "high", points: 7, description: "Triggered workflows + digests." },
    ],
  },
  {
    id: "file-storage",
    name: "File Storage",
    category: "Infrastructure",
    description: "File uploads, storage, and asset management.",
    providers: ["Supabase Storage", "AWS S3", "Cloudflare R2"],
    complexity: [
      { level: "low", points: 2, description: "Single file upload + public URLs." },
      { level: "standard", points: 5, description: "Multiple file types + signed URLs + size limits." },
      { level: "high", points: 9, description: "Image processing + CDN + folder structure." },
    ],
  },
  {
    id: "user-profile",
    name: "User Profile",
    category: "Core",
    description: "Profile management, avatar, and account settings.",
    complexity: [
      { level: "low", points: 2, description: "Display name + avatar upload." },
      { level: "standard", points: 4, description: "Extended fields + email change + password reset." },
      { level: "high", points: 7, description: "Account deletion + data export + audit trail." },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding Flow",
    category: "Core",
    description: "First-run experience guiding users to activation.",
    complexity: [
      { level: "low", points: 2, description: "Welcome screen + single setup step." },
      { level: "standard", points: 5, description: "Multi-step wizard + progress tracking." },
      { level: "high", points: 9, description: "Conditional flows + completion checklist + welcome email." },
    ],
  },
  {
    id: "search",
    name: "Search",
    category: "Data",
    description: "Full-text and filtered search across content.",
    providers: ["Postgres FTS", "Algolia", "Typesense", "Meilisearch"],
    complexity: [
      { level: "low", points: 3, description: "Basic keyword search on a single table." },
      { level: "standard", points: 6, description: "Multi-field search + filters + pagination." },
      { level: "high", points: 10, description: "Faceted search + typo tolerance + ranking tuning." },
    ],
  },
  {
    id: "realtime",
    name: "Real-time Features",
    category: "Infrastructure",
    description: "Live data updates, presence, and collaborative state.",
    providers: ["Supabase Realtime", "Pusher", "Ably", "Socket.io"],
    complexity: [
      { level: "low", points: 3, description: "Live data refresh on a single view." },
      { level: "standard", points: 7, description: "Multi-channel subscriptions + presence indicators." },
      { level: "high", points: 12, description: "Collaborative editing + conflict resolution + offline sync." },
    ],
  },
  {
    id: "analytics",
    name: "Analytics & Tracking",
    category: "Data",
    description: "User behavior tracking, funnels, and event logging.",
    providers: ["PostHog", "Mixpanel", "Amplitude", "Custom"],
    complexity: [
      { level: "low", points: 2, description: "Pageview tracking + basic events." },
      { level: "standard", points: 4, description: "Custom events + funnels + retention." },
      { level: "high", points: 7, description: "Feature flags + A/B testing + dashboards." },
    ],
  },
  {
    id: "multi-tenancy",
    name: "Multi-tenancy",
    category: "Internal",
    description: "Workspace or organization model with member management.",
    complexity: [
      { level: "low", points: 5, description: "Single org per user + basic isolation." },
      { level: "standard", points: 10, description: "Org switching + member invites + roles." },
      { level: "high", points: 16, description: "Custom domains + SSO per org + usage limits." },
    ],
  },
  {
    id: "roles-permissions",
    name: "Roles & Permissions",
    category: "Internal",
    description: "Role-based access control for resources and actions.",
    complexity: [
      { level: "low", points: 3, description: "Fixed roles (admin / user) + basic guards." },
      { level: "standard", points: 6, description: "Custom roles + resource-level policies." },
      { level: "high", points: 10, description: "Permissions matrix + audit log + delegated admin." },
    ],
  },
  {
    id: "landing-pages",
    name: "Landing / Marketing Pages",
    category: "Core",
    description: "Public-facing marketing pages and content sections.",
    complexity: [
      { level: "low", points: 2, description: "Static single page with CTA." },
      { level: "standard", points: 4, description: "Multiple sections + responsive layout + SEO metadata." },
      { level: "high", points: 7, description: "CMS-driven content + blog + i18n." },
    ],
  },
];
