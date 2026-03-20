const FooterMini = () => {
  return (
    <footer className="relative z-10 border-t border-white/10 py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Jitwise
            </div>
            <p className="max-w-md text-sm text-white/60">
              Jitwise - A scope-first estimation framework for developers.
            </p>
            <p className="text-xs text-white/40">
              Built for teams who want defensible estimates and clearer
              client conversations.
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/60">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Product
            </p>
            <a
              className="block transition hover:text-white"
              href="/#how-it-works"
            >
              How it works
            </a>
            <a
              className="block transition hover:text-white"
              href="/#example-output"
            >
              Demo
            </a>
            <a className="block transition hover:text-white" href="/#pricing">
              Pricing
            </a>
          </div>
          <div className="space-y-3 text-sm text-white/60">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Get started
            </p>
            <a className="block transition hover:text-white" href="/login">
              Try Jitwise
            </a>
            <a className="block transition hover:text-white" href="/contact">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 md:flex-row md:items-center">
          <span>© 2026 Jitwise. All rights reserved.</span>
          <div className="flex flex-wrap gap-4">
            <a className="transition hover:text-white" href="/privacy">
              Privacy
            </a>
            <a className="transition hover:text-white" href="/terms">
              Terms
            </a>
            <a className="transition hover:text-white" href="https://github.com">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterMini;
