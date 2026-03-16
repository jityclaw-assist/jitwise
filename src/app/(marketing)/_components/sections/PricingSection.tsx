import Link from "next/link";

const FREE_FEATURES = [
  "3 saved estimates",
  "Full wizard with all modules",
  "AI client summary",
  "Risk & urgency modeling",
];

const PRO_FEATURES = [
  "Unlimited estimates",
  "Shareable public links",
  "PDF export",
  "Calibration hints from history",
  "AI advisor (scope review)",
  "Compare mode",
];

const PricingSection = () => {
  return (
    <section className="relative z-10 py-20" id="pricing">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jityellow">
            Pricing
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Free to start. Pro when you scale.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-7">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
              Free
            </p>
            <p className="mt-2 text-4xl font-bold text-white">$0</p>
            <p className="mt-1 text-sm text-white/50">forever</p>
            <ul className="mt-6 space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-8 block rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Start free →
            </Link>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-2xl border border-jitcyan/40 bg-jitblue/50 p-7">
            <p className="text-sm font-semibold uppercase tracking-widest text-jitcyan">
              Pro
            </p>
            <p className="mt-2 text-4xl font-bold text-white">$12<span className="ml-1 text-lg font-normal text-white/50">/mo</span></p>
            <p className="mt-1 text-sm text-white/50">all features unlocked</p>
            <ul className="mt-6 space-y-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="mt-0.5 text-jitcyan">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="mt-8 block rounded-xl bg-jitcyan/20 border border-jitcyan/50 py-3 text-center text-sm font-semibold text-jitcyan transition hover:bg-jitcyan/30"
            >
              See all features & upgrade →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
