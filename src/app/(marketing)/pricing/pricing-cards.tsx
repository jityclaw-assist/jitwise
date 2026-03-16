"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Feature = { text: string; included: boolean };

export function PricingCards({
  freeFeatures,
  proFeatures,
}: {
  freeFeatures: Feature[];
  proFeatures: Feature[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
      {/* Free */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Free
        </p>
        <p className="mt-3 text-5xl font-bold text-white">$0</p>
        <p className="mt-1 text-sm text-white/40">forever</p>

        <ul className="mt-8 flex-1 space-y-3">
          {freeFeatures.map((f) => (
            <li key={f.text} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 shrink-0 text-base leading-none ${
                  f.included ? "text-emerald-400" : "text-white/20"
                }`}
              >
                {f.included ? "✓" : "✕"}
              </span>
              <span className={f.included ? "text-white/80" : "text-white/30 line-through"}>
                {f.text}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          className="mt-8 block rounded-xl border border-white/20 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Start free →
        </Link>
      </div>

      {/* Pro */}
      <div className="flex flex-col rounded-2xl border border-jitcyan/50 bg-gradient-to-b from-jitblue/60 to-black/40 p-8 shadow-[0_0_40px_rgba(0,229,255,0.06)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-jitcyan">
            Pro
          </p>
          <span className="rounded-full border border-jitcyan/30 bg-jitcyan/10 px-3 py-1 text-xs font-semibold text-jitcyan">
            Most popular
          </span>
        </div>
        <p className="mt-3 text-5xl font-bold text-white">$12</p>
        <p className="mt-1 text-sm text-white/40">per month · cancel anytime</p>

        <ul className="mt-8 flex-1 space-y-3">
          {proFeatures.map((f) => (
            <li key={f.text} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 shrink-0 text-base leading-none text-jitcyan">
                ✓
              </span>
              <span className="text-white/80">{f.text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="mt-8 block w-full rounded-xl bg-jitcyan py-3.5 text-center text-sm font-semibold text-black transition hover:bg-jitcyan/90 disabled:opacity-60"
        >
          {loading ? "Redirecting…" : "Upgrade to Pro →"}
        </button>
        <p className="mt-3 text-center text-xs text-white/30">
          Secure checkout via Stripe
        </p>
      </div>
    </div>
  );
}
