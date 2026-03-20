"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FiClock, FiDollarSign, FiLayers, FiTrendingUp } from "react-icons/fi";

const TABS = ["Overview", "Scope", "Client Brief"] as const;
type Tab = (typeof TABS)[number];

const MODULES = [
  { name: "Authentication", complexity: "Medium", points: 8, pct: 16, probHrs: 26, minHrs: 19, maxHrs: 35 },
  { name: "Dashboard & Analytics", complexity: "High", points: 16, pct: 32, probHrs: 51, minHrs: 37, maxHrs: 69 },
  { name: "Billing & Subscriptions", complexity: "High", points: 13, pct: 26, probHrs: 42, minHrs: 30, maxHrs: 56 },
  { name: "API Integration", complexity: "Medium", points: 8, pct: 16, probHrs: 26, minHrs: 19, maxHrs: 35 },
  { name: "Notifications", complexity: "Low", points: 5, pct: 10, probHrs: 16, minHrs: 12, maxHrs: 22 },
];

const SUMMARY_TEXT = `## Project Summary

This estimate covers the development of a SaaS platform with a focus on reliability and delivery within an 8-week timeline.

### Scope
The project includes Authentication, Dashboard & Analytics, Billing & Subscriptions, API Integration, and Notifications — 50 scope points in total.

### Timeline & Risk
With a **medium risk weight (1.35×)** and an **expedite urgency (1.2×)**, the probable effort is **~202 hours**, equivalent to **$20,200** at the agreed rate.

> The range of 143–273 hours reflects realistic variance for a system of this complexity. Recommend weekly milestone reviews to stay within the probable band.`;

function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

const complexityColor: Record<string, string> = {
  Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  High: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

export default function ExampleOutputSection() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.25 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const probHrs = useCountUp(202, 1400, animated);
  const minHrs = useCountUp(143, 1200, animated);
  const maxHrs = useCountUp(273, 1600, animated);
  const probCost = useCountUp(20200, 1400, animated);

  return (
    <section className="relative z-10 py-24" id="example-output">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-jityellow">
            Demo
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            What your estimate looks like.
          </h2>
          <p className="mt-5 text-lg text-white/60">
            Not just a number — a fully structured, explainable breakdown your
            client can trust.
          </p>
        </div>

        {/* App window mockup */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 32 }}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0f] shadow-2xl shadow-black/60"
        >
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-white/8 bg-white/3 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
              <span>SaaS Platform · 50pts · Medium risk · Expedite</span>
            </div>
            <span className="rounded-full border border-jitcyan/30 px-2.5 py-0.5 text-xs text-jitcyan">
              Sample
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/8 px-5 pt-3">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-jitcyan text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "Overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        icon: FiClock,
                        label: "Probable effort",
                        value: `${probHrs}h`,
                        sub: `${minHrs}h – ${maxHrs}h`,
                        accent: "jitcyan",
                      },
                      {
                        icon: FiDollarSign,
                        label: "Probable cost",
                        value: `$${probCost.toLocaleString()}`,
                        sub: "at $100/hr",
                        accent: "jityellow",
                      },
                      {
                        icon: FiTrendingUp,
                        label: "Risk weight",
                        value: "1.35×",
                        sub: "Medium risk",
                        accent: "amber",
                      },
                      {
                        icon: FiLayers,
                        label: "Scope points",
                        value: "50 pts",
                        sub: "5 modules",
                        accent: "purple",
                      },
                    ].map((card, i) => (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={animated ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <card.icon className="mb-2 h-4 w-4 text-white/40" />
                        <div className="text-xs text-white/50">{card.label}</div>
                        <div className="mt-1 text-xl font-bold text-white tabular-nums">
                          {card.value}
                        </div>
                        <div className="mt-0.5 text-xs text-white/40">{card.sub}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Module table */}
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-px bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/30">
                      <span>Module</span>
                      <span className="hidden text-right sm:block">Points</span>
                      <span className="text-right">%</span>
                      <span className="text-right">Probable hrs</span>
                      <span className="hidden text-right sm:block">Range</span>
                    </div>
                    {MODULES.map((mod, i) => (
                      <motion.div
                        key={mod.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={animated ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-px border-t border-white/5 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/80">{mod.name}</span>
                          <span
                            className={`hidden rounded-full border px-2 py-0.5 text-xs sm:inline ${complexityColor[mod.complexity]}`}
                          >
                            {mod.complexity}
                          </span>
                        </div>
                        <span className="hidden text-right text-white/50 tabular-nums sm:block">
                          {mod.points}
                        </span>
                        <span className="text-right text-white/50 tabular-nums">
                          {mod.pct}%
                        </span>
                        <span className="text-right font-semibold text-white tabular-nums">
                          {mod.probHrs}h
                        </span>
                        <span className="hidden text-right text-xs text-white/35 tabular-nums sm:block">
                          {mod.minHrs}–{mod.maxHrs}h
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "Scope" && (
                <motion.div
                  key="scope"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-3"
                >
                  {MODULES.map((mod, i) => (
                    <motion.div
                      key={mod.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-5 py-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{mod.name}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${complexityColor[mod.complexity]}`}
                          >
                            {mod.complexity}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-white/40">
                          {mod.points} scope points · {mod.pct}% of total
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{mod.probHrs}h</div>
                        <div className="text-xs text-white/35">
                          {mod.minHrs}–{mod.maxHrs}h
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <div className="mt-2 grid grid-cols-3 gap-3 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-center text-sm">
                    <div>
                      <div className="text-xs text-white/40">Base points</div>
                      <div className="mt-1 font-bold text-white">50 pts</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40">Risk × Urgency</div>
                      <div className="mt-1 font-bold text-amber-400">1.35 × 1.2</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40">Multiplied hrs</div>
                      <div className="mt-1 font-bold text-jitcyan">202h probable</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "Client Brief" && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="rounded-2xl border border-white/8 bg-white/3 px-6 py-5"
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    {SUMMARY_TEXT.split("\n").map((line, i) => {
                      if (line.startsWith("## "))
                        return (
                          <h2 key={i} className="mb-2 mt-0 text-lg font-bold text-white">
                            {line.replace("## ", "")}
                          </h2>
                        );
                      if (line.startsWith("### "))
                        return (
                          <h3 key={i} className="mb-1 mt-4 text-sm font-semibold text-white/80">
                            {line.replace("### ", "")}
                          </h3>
                        );
                      if (line.startsWith("> "))
                        return (
                          <blockquote
                            key={i}
                            className="mt-3 border-l-2 border-jitcyan/50 pl-4 text-sm italic text-white/50"
                          >
                            {line.replace("> ", "")}
                          </blockquote>
                        );
                      if (line === "") return <div key={i} className="h-2" />;
                      const parsed = line
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>");
                      return (
                        <p
                          key={i}
                          className="text-sm leading-relaxed text-white/60"
                          dangerouslySetInnerHTML={{ __html: parsed }}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
