"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { UpgradeModal, type UpgradeFeature } from "./upgrade-modal";

type UpgradeGateProps = {
  feature: UpgradeFeature;
  isProActive: boolean;
  children: React.ReactNode;
  label?: string;
};

/**
 * Wraps children with a visual lock overlay when the user is on the free plan.
 * Clicking the overlay opens the contextual upgrade modal.
 */
export function UpgradeGate({ feature, isProActive, children, label = "Pro feature" }: UpgradeGateProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (isProActive) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        {/* Desaturated content */}
        <div
          className="pointer-events-none select-none"
          style={{ filter: "grayscale(0.6) opacity(0.5)" }}
          aria-hidden
        >
          {children}
        </div>
        {/* Overlay */}
        <button
          onClick={() => setModalOpen(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/60 backdrop-blur-[1px] transition hover:bg-card/70"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{label}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Click to upgrade</span>
        </button>
      </div>
      {modalOpen && (
        <UpgradeModal feature={feature} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
