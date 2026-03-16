
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

export const NavBar = () => {
  const sections = useMemo(
    () => [
      { id: "hero", label: "Home" },
      { id: "pain", label: "The Pain" },
      { id: "insight", label: "The Insight" },
      { id: "how-it-works", label: "How it works" },
      { id: "features", label: "Features" },
      { id: "example-output", label: "Example output" },
      { id: "social-proof", label: "Teams" },
      { id: "final-cta", label: "Get started" },
    ],
    []
  );
  const [activeId, setActiveId] = useState<string>("hero");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean) as HTMLElement[];

    if (!elements.length) {
      return;
    }

    let frameId = 0;

    const updateActive = () => {
      const offset = window.innerHeight * 0.3;
      const current =
        elements
          .map((el) => ({
            id: el.id,
            top: el.getBoundingClientRect().top,
          }))
          .filter((item) => item.top - offset <= 0)
          .sort((a, b) => b.top - a.top)[0]?.id || elements[0].id;

      setActiveId(current);
    };

    const onScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  const handleNavClick = (id: string) => {
    setActiveId(id);
    setIsOpen(false);
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-full gap-4 items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
              Jitwise
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm backdrop-blur md:flex">
              {sections.slice(0, 6).map((section) => {
                const isActive = activeId === section.id;
                return (
                  <Link
                    className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      isActive
                        ? "bg-white/15 text-white shadow-[0_0_20px_rgba(0,172,255,0.3)]"
                        : "text-white/60 hover:text-white"
                    }`}
                    href={`/#${section.id}`}
                    key={section.id}
                    onClick={() => handleNavClick(section.id)}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/pricing"
              className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-jitcyan px-4 py-2 text-xs font-semibold text-black transition hover:bg-jitcyan/90"
            >
              Start free →
            </Link>
          </div>

          <button
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white md:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            type="button"
          >
            {isOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
        </div>

        <div
          className={`md:hidden ${isOpen ? "block" : "hidden"}`}
        >
          <div className="mx-4 rounded-3xl border border-white/10 bg-black/80 p-6 text-white backdrop-blur">
            <div className="grid gap-3">
              {sections.map((section) => {
                const isActive = activeId === section.id;
                return (
                  <Link
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                      isActive
                        ? "border-jitcyan/60 bg-jitcyan/10 text-white shadow-[0_0_18px_rgba(0,172,255,0.35)]"
                        : "border-white/10 text-white/70 hover:text-white"
                    }`}
                    href={`/#${section.id}`}
                    key={section.id}
                    onClick={() => handleNavClick(section.id)}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/pricing"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center rounded-2xl border border-jitcyan/50 bg-jitcyan/10 px-4 py-3 text-sm font-semibold text-jitcyan transition hover:bg-jitcyan/20"
              >
                Start free →
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
