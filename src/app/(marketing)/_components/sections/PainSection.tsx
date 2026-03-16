 "use client";

const PAIN_POINTS = [
  {
    icon: "✗",
    title: "You write a proposal in Google Docs for 2 hours.",
    body: "The client asks for a discount. You guess a new number. You never know if it was fair.",
    color: "text-red-400",
    bg: "bg-red-500/5 border-red-500/20",
  },
  {
    icon: "✗",
    title: "You underestimate a module.",
    body: "The project runs 40% over. You eat the cost. The client is confused — the estimate looked solid.",
    color: "text-orange-400",
    bg: "bg-orange-500/5 border-orange-500/20",
  },
  {
    icon: "✗",
    title: "You can't remember why last month's project cost more.",
    body: "No history. No pattern. Every estimate starts from zero with the same guesswork.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/5 border-yellow-500/20",
  },
];

const PainSection = () => {
  return (
    <section className="relative z-10 py-20" id="pain">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jityellow">
            The Problem
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Sound familiar?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Every freelancer runs into these walls. The problem isn&apos;t effort — it&apos;s the lack of structure.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {PAIN_POINTS.map((p) => (
            <div
              key={p.title}
              className={`rounded-2xl border p-6 ${p.bg}`}
            >
              <span className={`text-2xl font-bold ${p.color}`}>{p.icon}</span>
              <p className={`mt-3 text-base font-semibold text-white`}>{p.title}</p>
              <p className="mt-2 text-sm text-white/60">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainSection;
