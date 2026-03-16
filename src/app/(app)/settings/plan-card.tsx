"use client";

import { useState } from "react";
import Link from "next/link";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function PlanCard({
  plan,
  isProActive,
  hasStripeCustomer,
  planExpiresAt,
  estimationCount,
  advisorUsesLeft,
}: {
  plan: "free" | "pro";
  isProActive: boolean;
  hasStripeCustomer: boolean;
  planExpiresAt: string | null;
  estimationCount: number;
  advisorUsesLeft: number | null;
}) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleUpgrade = async () => {
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManage = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="max-w-xl rounded-2xl border border-border bg-card p-7 flex flex-col gap-6">
      {/* Current plan badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current plan
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {isProActive ? "Pro" : "Free"}
          </p>
          {isProActive && planExpiresAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {plan === "pro"
                ? `Renews ${formatDate(planExpiresAt)}`
                : `Active until ${formatDate(planExpiresAt)}`}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isProActive
              ? "bg-jitcyan/15 text-jitcyan border border-jitcyan/30"
              : "bg-white/5 text-white/40 border border-white/10"
          }`}
        >
          {isProActive ? "Active" : "Free tier"}
        </span>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">Estimates saved</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {estimationCount}
            {!isProActive && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">/ 3</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">AI advisor uses left</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {advisorUsesLeft === null ? "∞" : advisorUsesLeft}
            {advisorUsesLeft !== null && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">this month</span>
            )}
          </p>
        </div>
      </div>

      {/* CTA */}
      {!isProActive ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            disabled={loadingCheckout}
            className="w-full rounded-xl bg-jitcyan py-3.5 text-sm font-semibold text-black transition hover:bg-jitcyan/90 disabled:opacity-60"
          >
            {loadingCheckout ? "Redirecting…" : "Upgrade to Pro — $12/mo →"}
          </button>
          <Link
            href="/pricing"
            className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            See what's included in Pro
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {hasStripeCustomer && (
            <button
              onClick={handleManage}
              disabled={loadingPortal}
              className="w-full rounded-xl border border-border bg-foreground/5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-foreground/10 disabled:opacity-60"
            >
              {loadingPortal ? "Opening portal…" : "Manage subscription →"}
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Cancel, update payment method, or download invoices via Stripe.
          </p>
        </div>
      )}
    </div>
  );
}
