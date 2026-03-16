 "use client";

// TODO: replace placeholder testimonials with real ones from actual users when confirmed
const TESTIMONIALS = [
  {
    quote:
      "I used to spend half a day putting together a proposal. Now I send something structured in 15 minutes — and clients actually read it.",
    name: "Alex R.",
    role: "Freelance full-stack developer",
  },
  {
    quote:
      "The risk multiplier alone changed how I price projects. I stopped undercharging for tight deadlines.",
    name: "Marina C.",
    role: "Independent software consultant",
  },
  {
    quote:
      "Finally something that speaks engineering, not project management theater. The module breakdown matches how I actually think about scope.",
    name: "David T.",
    role: "Freelance backend engineer",
  },
];

const SocialProofSection = () => {
  return (
    <section className="relative z-10 py-20" id="social-proof">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jitcyan">
            What freelancers say
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Built for people who deliver.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm leading-relaxed text-white/80">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-auto">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/50">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
