import { notFound, redirect } from "next/navigation";

import { EstimationViewTabs } from "@/components/estimate/estimation-view-tabs";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
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

export default async function EstimationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getAuthenticatedSupabase();

  if (!auth) {
    redirect("/login");
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

  const { data: documentData } = await supabase
    .from("documents")
    .select("title")
    .eq("estimation_id", id)
    .eq("user_id", user.id);

  const documentTitles = (documentData ?? []).map((d: { title: string }) => d.title);

  const estimation = data as EstimationRow;
  const clientSummary =
    estimation.client_summary ??
    generateClientSummary({
      input: estimation.input,
      result: estimation.result,
      modules: MODULE_CATALOG,
    });

  const moduleDetails = estimation.input.modules.map((selection) => {
    const module = MODULE_CATALOG.find((entry) => entry.id === selection.moduleId);
    const complexity = module?.complexity.find((entry) => entry.level === selection.complexity);

    return {
      id: selection.moduleId,
      name: module?.name ?? selection.moduleId,
      complexity: selection.complexity,
      provider: selection.provider ?? null,
      description: complexity?.description ?? module?.description ?? "",
      points: complexity?.points ?? 0,
    };
  });

  const { baseScopePoints, hoursRange, pricingRange } = estimation.result;
  const moduleBreakdown = moduleDetails
    .map((m) => {
      const ratio = baseScopePoints > 0 ? m.points / baseScopePoints : 0;
      return {
        ...m,
        pct: Math.round(ratio * 100),
        hoursProbable: Math.round(ratio * hoursRange.probable * 10) / 10,
        hoursMin: Math.round(ratio * hoursRange.min * 10) / 10,
        hoursMax: Math.round(ratio * hoursRange.max * 10) / 10,
        costProbable: Math.round(ratio * pricingRange.probable),
      };
    })
    .sort((a, b) => b.points - a.points);

  return (
    <main className="py-12">
      <EstimationViewTabs
        estimationId={estimation.id}
        createdAt={estimation.created_at}
        input={estimation.input}
        result={estimation.result}
        clientSummary={clientSummary}
        moduleDetails={moduleDetails}
        moduleBreakdown={moduleBreakdown}
        outcomeData={outcomeData as OutcomeRow | null}
        documentTitles={documentTitles}
        documentCount={documentTitles.length}
      />
    </main>
  );
}
