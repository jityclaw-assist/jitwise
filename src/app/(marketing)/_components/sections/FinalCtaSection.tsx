import GradientButton from "@/components/kokonutui/gradient-button";

const FinalCtaSection = () => {
  return (
    <section className="relative z-10 py-20" id="final-cta">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-jitcyan/40 bg-jitblue/70 p-10 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jityellow">
            Ready to estimate smarter?
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Create your first estimate free.
          </h2>
          <p className="mt-6 text-lg text-white/70">
            No credit card required. 3 estimates free forever.
          </p>
          <div className="mt-8">
            <GradientButton
              href="/login"
              label="Create your first estimate free →"
              variant="orange"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
