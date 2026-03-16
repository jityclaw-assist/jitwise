import Link from "next/link";
import { redirect } from "next/navigation";

import { ComparisonView } from "@/components/estimate/comparison-view";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary";

type EstimationRow = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
  client_summary?: Pick<ClientSummary, "summaryText"> | null;
};

export default async function CompareEstimationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length < 2 || ids.length > 3) {
    redirect("/estimations");
  }

  const auth = await getAuthenticatedSupabase();
  if (!auth) {
    redirect("/login");
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .in("id", ids)
    .eq("user_id", user.id);

  if (error || !data || data.length !== ids.length) {
    redirect("/estimations");
  }

  // Preserve requested order
  const byId = new Map((data as EstimationRow[]).map((e) => [e.id, e]));
  const estimations = ids
    .map((id) => byId.get(id))
    .filter((e): e is EstimationRow => Boolean(e));

  return (
    <main className="flex flex-col gap-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Comparison
          </p>
          <h1 className="text-2xl font-semibold">
            Comparing {estimations.length} estimations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side breakdown of scope, effort, and cost differences.
          </p>
        </div>
        <Link
          href="/estimations"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
        >
          Back to list
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <ComparisonView estimations={estimations} />
      </div>
    </main>
  );
}
