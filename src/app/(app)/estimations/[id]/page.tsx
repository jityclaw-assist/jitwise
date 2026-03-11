import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { ClientSummaryActions } from "@/components/estimate/client-summary-actions";
import { DeleteEstimationButton } from "@/components/estimate/delete-estimation-button";
import { DocumentsPanel } from "@/components/estimate/documents-panel";
import { OutcomePanel } from "@/components/estimate/outcome-panel";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type {
  EstimationInput,
  EstimationResult,
} from "@/lib/schema/estimation";
import { generateClientSummary, type ClientSummary } from "@/lib/summary";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type EstimationRow = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
  client_summary?: ClientSummary | null;
};

type OutcomeRow = {
  actual_hours: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  notes: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default async function EstimationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    return (
      <main className="flex flex-col gap-4 py-12">
        <h1 className="text-2xl font-semibold">Estimate</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to view this estimation.
        </p>
      </main>
    );
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const { data: outcomeData } = await supabase
    .from("estimation_outcomes")
    .select("actual_hours, actual_cost, completed_at, notes")
    .eq("estimation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const estimation = data as EstimationRow;
  const clientSummary =
    estimation.client_summary ??
    generateClientSummary({
      input: estimation.input,
      result: estimation.result,
      modules: MODULE_CATALOG,
    });

  const moduleDetails = estimation.input.modules.map((selection) => {
    const module = MODULE_CATALOG.find(
      (entry) => entry.id === selection.moduleId
    );
    const complexity = module?.complexity.find(
      (entry) => entry.level === selection.complexity
    );

    return {
      id: selection.moduleId,
      name: module?.name ?? selection.moduleId,
      complexity: selection.complexity,
      provider: selection.provider ?? null,
      description: complexity?.description ?? module?.description ?? "",
      points: complexity?.points ?? 0,
    };
  });

  return (
    <main className="flex flex-col gap-8 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Saved estimate
          </p>
          <h1 className="text-2xl font-semibold">Estimate overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(estimation.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientSummaryActions summaryText={clientSummary.summaryText} />
          <Link
            href={`/estimate/${estimation.id}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
          >
            Edit
          </Link>
          <Link
            href="/estimations"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
          >
            Back to list
          </Link>
          <DeleteEstimationButton estimationId={estimation.id} />
        </div>
      </div>

      <ClientSummaryPanel
        summary={clientSummary}
        subtitle="Client summary"
        title="Client-ready overview"
        estimationInput={estimation.input}
        estimationResult={estimation.result}
      />

      <OutcomePanel
        estimationId={estimation.id}
        estimationSummary={{
          estimatedHoursProbable: estimation.result.hoursRange.probable,
          estimatedCostProbable: estimation.result.pricingRange.probable,
        }}
        initialOutcome={outcomeData as OutcomeRow | null}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Scope modules
          </h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm">
            {moduleDetails.map((module) => (
              <li
                key={module.id}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{module.name}</p>
                      {module.provider && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {module.provider}
                        </span>
                      )}
                    </div>
                    {module.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="font-semibold uppercase">
                      {module.complexity}
                    </div>
                    <div>{module.points} pts</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-foreground/5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Output ranges
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Base scope points</span>
              <span className="font-semibold">
                {estimation.result.baseScopePoints}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Risk multiplier</span>
              <span className="font-semibold">
                {estimation.result.riskMultiplier}x
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Urgency multiplier</span>
              <span className="font-semibold">
                {estimation.result.urgencyMultiplier}x
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hourly rate</span>
              <span className="font-semibold">${estimation.input.hourlyRate}</span>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Hours
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Min</span>
                <span className="font-semibold">
                  {estimation.result.hoursRange.min} hrs
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Probable</span>
                <span className="font-semibold">
                  {estimation.result.hoursRange.probable} hrs
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Max</span>
                <span className="font-semibold">
                  {estimation.result.hoursRange.max} hrs
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pricing
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Min</span>
                <span className="font-semibold">
                  ${estimation.result.pricingRange.min}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Probable</span>
                <span className="font-semibold">
                  ${estimation.result.pricingRange.probable}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Max</span>
                <span className="font-semibold">
                  ${estimation.result.pricingRange.max}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <DocumentsPanel estimationId={estimation.id} />
    </main>
  );
}
