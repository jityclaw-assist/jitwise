"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  PROJECT_TYPE_ICONS,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/onboarding/templates";

const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [hourlyRate, setHourlyRate] = useState("75");
  const [submitting, setSubmitting] = useState(false);

  // Slide direction: step 1 exits left, step 2 enters right
  const handleNext = () => setStep(2);

  const handleSubmit = async () => {
    if (!projectType) return;
    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            onboarding_project_type: projectType,
          })
          .eq("id", userId);
      }
    } catch {
      // Non-blocking — proceed even if profile update fails
    }

    const rate = Number(hourlyRate);
    const safeRate = Number.isNaN(rate) || rate <= 0 ? 75 : rate;
    router.push(`/estimate?preset=${projectType}&rate=${safeRate}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[560px]">
        {/* Logo */}
        <p className="mb-10 text-center text-sm font-bold tracking-tight text-foreground">
          Jitwise
        </p>

        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-6 bg-foreground" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold leading-tight text-foreground">
            {step === 1
              ? "Let's build your first estimate"
              : "What's your hourly rate?"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1
              ? "Answer 2 quick questions and we'll set everything up."
              : "This sets your default rate — you can change it per project."}
          </p>
        </div>

        {/* Step 1 — Project type */}
        <div
          className={`transition-all duration-250 ${
            step === 1 ? "block" : "hidden"
          }`}
        >
          <div className="grid grid-cols-2 gap-3">
            {PROJECT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setProjectType(type)}
                className={[
                  "flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all duration-200",
                  projectType === type
                    ? "scale-[1.02] border-foreground/40 bg-foreground/10 shadow-sm"
                    : "border-border bg-card hover:border-foreground/20 hover:bg-foreground/5",
                ].join(" ")}
              >
                <span className="text-3xl">{PROJECT_TYPE_ICONS[type]}</span>
                <span className="text-sm font-semibold text-foreground">
                  {PROJECT_TYPE_LABELS[type]}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!projectType}
            className="mt-6 w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
          >
            Next →
          </button>
        </div>

        {/* Step 2 — Hourly rate */}
        <div
          className={`transition-all duration-250 ${
            step === 2 ? "block" : "hidden"
          }`}
        >
          <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card">
            <span className="border-r border-border px-4 py-3.5 text-sm font-semibold text-muted-foreground">
              $
            </span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="75"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="flex-1 bg-transparent px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            <span className="border-l border-border px-4 py-3.5 text-sm text-muted-foreground">
              /hr
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave blank to use $75/hr as the default.
          </p>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Setting up…" : "Build my first estimate →"}
          </button>
        </div>
      </div>
    </main>
  );
}
