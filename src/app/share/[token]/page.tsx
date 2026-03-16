import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownRenderer } from "@/components/ui/markdown";
import { parseStructuredSummary } from "@/lib/summary/parse-structured-summary";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

type SharedEstimation = {
  id: string;
  createdAt: string;
  modules: { name: string; complexity: string; provider: string | null }[];
  riskLevel: string;
  urgencyLevel: string;
  hoursRange: { min: number; probable: number; max: number };
  pricingRange: { min: number; probable: number; max: number };
  summaryText: string | null;
  ownerRefToken: string | null;
};

const formatNum = (v: number, dec = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: dec }).format(v);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

async function fetchSharedEstimation(token: string): Promise<SharedEstimation | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/share/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SharedEstimation;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchSharedEstimation(token);
  if (!data) {
    return { title: "Estimate not found — Jitwise" };
  }

  const cost = `$${formatNum(data.pricingRange.probable, 0)}`;
  const hrs = `${formatNum(data.hoursRange.probable, 1)} hrs`;

  return {
    title: `Project Estimate — Jitwise`,
    description: `Probable cost: ${cost} · Probable effort: ${hrs}. View the full project proposal.`,
    openGraph: {
      title: "Project Estimate — Jitwise",
      description: `Probable cost: ${cost} · Probable effort: ${hrs}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Project Estimate — Jitwise",
      description: `Probable cost: ${cost} · Probable effort: ${hrs}`,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchSharedEstimation(token);

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Jitwise
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          This estimate is no longer available
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          The link may have been revoked or expired. If you received this from
          a freelancer, ask them to share a new link.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
        >
          Create your own estimate
        </Link>
      </main>
    );
  }

  const parsed = data.summaryText ? parseStructuredSummary(data.summaryText) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Minimal header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
            Jitwise
          </span>
          <a
            href="mailto:"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
          >
            Contactar
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Propuesta de proyecto
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            Project Estimate
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Estimado el {formatDate(data.createdAt)}
          </p>
        </div>

        {/* Key numbers */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Costo probable
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-gray-900 dark:text-white">
              ${formatNum(data.pricingRange.probable, 0)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Rango: ${formatNum(data.pricingRange.min, 0)} – ${formatNum(data.pricingRange.max, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Esfuerzo probable
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-gray-900 dark:text-white">
              {formatNum(data.hoursRange.probable, 1)}
              <span className="ml-1.5 text-xl font-normal text-gray-400">hrs</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Rango: {formatNum(data.hoursRange.min, 1)} – {formatNum(data.hoursRange.max, 1)} hrs
            </p>
          </div>
        </div>

        {/* Modules chips */}
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Alcance del proyecto
          </p>
          <div className="flex flex-wrap gap-2">
            {data.modules.map((m, i) => (
              <span
                key={i}
                className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {m.name}
                {m.provider ? ` · ${m.provider}` : ""}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs capitalize text-gray-500 dark:border-gray-700 dark:bg-gray-900">
              Riesgo: {data.riskLevel}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs capitalize text-gray-500 dark:border-gray-700 dark:bg-gray-900">
              Urgencia: {data.urgencyLevel}
            </span>
          </div>
        </div>

        {/* Structured summary sections */}
        {parsed && parsed.hasStructuredSections && (
          <div className="mb-8 flex flex-col gap-4">
            {parsed.included.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-800 dark:text-green-300">
                    Qué incluye esta propuesta
                  </p>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {parsed.included.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border-l-[3px] border-green-400 bg-white px-3 py-2 text-sm text-gray-700 dark:border-green-600 dark:bg-green-950/30 dark:text-gray-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.excluded.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-gray-500" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-gray-400">
                    Qué no incluye esta propuesta
                  </p>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {parsed.excluded.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border-l-[3px] border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.nextSteps.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-300">
                    Para iniciar necesitamos
                  </p>
                </div>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {parsed.nextSteps.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border-l-[3px] border-blue-400 bg-white px-3 py-2 text-sm text-gray-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-gray-200"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-blue-300 text-[10px] font-bold text-blue-500 dark:border-blue-600">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Free markdown */}
        {parsed?.freeMarkdown && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5 text-[15px] leading-relaxed dark:border-gray-800 dark:bg-gray-900">
            <MarkdownRenderer content={parsed.freeMarkdown} />
          </div>
        )}

        {/* Fallback: full summary if no structured sections */}
        {!parsed?.hasStructuredSections && data.summaryText && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5 text-[15px] leading-relaxed dark:border-gray-800 dark:bg-gray-900">
            <MarkdownRenderer content={data.summaryText} />
          </div>
        )}

        {/* CTA */}
        <a
          href="mailto:"
          className="block w-full rounded-xl bg-gray-900 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900 sm:hidden"
        >
          Contactar
        </a>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-6 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 px-6 text-center">
          <p className="text-xs text-gray-400">
            Built with{" "}
            <Link
              href={
                data.ownerRefToken
                  ? `/?ref=${data.ownerRefToken}&utm_source=share_link&utm_medium=referral&utm_campaign=jitwise_share`
                  : "/"
              }
              className="font-medium text-gray-600 underline underline-offset-2 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            >
              Jitwise
            </Link>{" "}
            — scope-first software estimation
          </p>
          <Link
            href={
              data.ownerRefToken
                ? `/login?ref=${data.ownerRefToken}&utm_source=share_link&utm_medium=referral`
                : "/login"
            }
            className="mt-1 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Create your free estimate →
          </Link>
        </div>
      </footer>
    </div>
  );
}
