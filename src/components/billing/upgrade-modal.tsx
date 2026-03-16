"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type UpgradeFeature = "estimations" | "share_link" | "advisor_monthly" | "comparison" | "pdf_export" | "calibration";

const FEATURE_COPY: Record<UpgradeFeature, { title: string; body: string; bullets: string[] }> = {
  estimations: {
    title: "You've reached 3 saved estimates",
    body: "Upgrade to Pro to keep building — your work stays saved.",
    bullets: [
      "Unlimited saved estimations",
      "Shareable client links",
      "Unlimited AI Advisor analyses",
    ],
  },
  share_link: {
    title: "Share links are a Pro feature",
    body: "Send clients a clean, professional link instead of a PDF attachment.",
    bullets: [
      "Public shareable page with your branding",
      "Revoke access at any time",
      "Client sees cost, scope, and summary — nothing internal",
    ],
  },
  advisor_monthly: {
    title: "You've used your 3 Advisor analyses this month",
    body: "Upgrade for unlimited AI-powered scope reviews.",
    bullets: [
      "Unlimited Advisor analyses per month",
      "Resets never — always available",
      "Access on every estimation",
    ],
  },
  comparison: {
    title: "Comparison view is a Pro feature",
    body: "Compare 2–3 estimations side by side to spot scope differences instantly.",
    bullets: [
      "Side-by-side module diff table",
      "Normalize rate toggle",
      "\"Why they differ\" breakdown",
    ],
  },
  pdf_export: {
    title: "PDF export is a Pro feature",
    body: "Export a clean, client-ready PDF with your estimate and summary.",
    bullets: [
      "Professional PDF layout",
      "Includes client summary cards",
      "Shareable offline",
    ],
  },
  calibration: {
    title: "Calibration signals are a Pro feature",
    body: "See which modules you consistently over or under-estimate.",
    bullets: [
      "Per-module accuracy signals",
      "Inline hints in the wizard",
      "Built from your real project outcomes",
    ],
  },
};

type UpgradeModalProps = {
  feature: UpgradeFeature;
  onClose: () => void;
};

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const copy = FEATURE_COPY[feature];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close — desktop only */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 hidden rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground sm:block"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Jitwise Pro
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground">
          {copy.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{copy.body}</p>

        <ul className="mt-4 flex flex-col gap-2">
          {copy.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-0.5 text-[#00ACFF]">✓</span>
              {bullet}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/pricing"
            className="block w-full rounded-xl bg-foreground py-3 text-center text-sm font-semibold text-background transition hover:opacity-90"
          >
            Upgrade to Pro — $12/mo
          </a>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export type { UpgradeFeature };
