import type { Metadata } from "next";
import { PricingCards } from "./pricing-cards";

export const metadata: Metadata = {
  title: "Pricing — Jitwise",
  description:
    "Free to start. Upgrade to Pro for unlimited estimates, shareable links, PDF export, and AI advisor access.",
};

const FREE_FEATURES = [
  { text: "3 saved estimates", included: true },
  { text: "Full wizard with all modules", included: true },
  { text: "AI client summary", included: true },
  { text: "Risk & urgency modeling", included: true },
  { text: "Shareable public links", included: false },
  { text: "PDF export", included: false },
  { text: "Calibration hints from history", included: false },
  { text: "AI advisor (scope review)", included: false },
  { text: "Compare mode", included: false },
  { text: "Unlimited estimates", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited estimates", included: true },
  { text: "Full wizard with all modules", included: true },
  { text: "AI client summary", included: true },
  { text: "Risk & urgency modeling", included: true },
  { text: "Shareable public links", included: true },
  { text: "PDF export", included: true },
  { text: "Calibration hints from history", included: true },
  { text: "AI advisor (scope review) — 10 uses/month", included: true },
  { text: "Compare mode", included: true },
  { text: "Priority support", included: true },
];

export default function PricingPage() {
  return (
    <main className="relative z-10 mx-auto max-w-5xl px-6 py-20">
      {/* Header */}
      <div className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jityellow">
          Pricing
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white md:text-5xl">
          Free to start. Pro when you scale.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
          No hidden fees. Cancel anytime. Referrals earn you free Pro months.
        </p>
      </div>

      {/* Cards */}
      <PricingCards freeFeatures={FREE_FEATURES} proFeatures={PRO_FEATURES} />

      {/* FAQ */}
      <div className="mt-20 border-t border-white/10 pt-14">
        <h2 className="mb-8 text-2xl font-bold text-white">
          Frequently asked questions
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="text-sm font-semibold text-white">{item.q}</p>
              <p className="mt-2 text-sm text-white/60">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const FAQ = [
  {
    q: "What counts as a saved estimate?",
    a: "Each time you click 'Save estimate' in the wizard, it counts as one. You can build and review unlimited estimates without saving — the limit only applies to saved/stored ones.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel through your billing portal and you'll keep Pro access until the end of the billing period. No questions asked.",
  },
  {
    q: "How do referral rewards work?",
    a: "When someone you refer saves their first estimate, you automatically receive 1 free month of Pro. Rewards accumulate — 3 referrals = 3 free months.",
  },
  {
    q: "Is the AI advisor included in Pro?",
    a: "Yes. Pro includes 10 AI advisor uses per month. The advisor reviews your scope and flags risks or missing modules before you send the estimate.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit and debit cards via Stripe. Invoicing available for annual plans on request.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. All estimates are private to your account. Shared estimates are only accessible via their unique link, which you can revoke at any time.",
  },
];
