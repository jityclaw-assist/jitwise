import { notFound, redirect } from "next/navigation";

import { ClientSummaryPanel } from "@/components/estimate/client-summary-panel";
import { EstimatorWizard } from "@/components/estimate/estimator-wizard";
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

export default async function EditEstimatePage({
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
    .select("id, input, result, client_summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const estimation = data as EstimationRow;
  const clientSummary =
    estimation.client_summary ??
    generateClientSummary({
      input: estimation.input,
      result: estimation.result,
      modules: MODULE_CATALOG,
    });

  return (
    <main className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Edit estimate
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Update the estimate inputs
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Adjust scope or risk assumptions, then save to update stored ranges.
          </p>
        </div>
      </header>
      <ClientSummaryPanel
        summary={clientSummary}
        subtitle="Current client summary"
        title="Latest saved summary"
      />
      <EstimatorWizard
        modules={MODULE_CATALOG}
        estimationId={estimation.id}
        initialInput={estimation.input}
      />
    </main>
  );
}
