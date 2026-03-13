export const runtime = "nodejs";

import { generateClientSummary } from "@/lib/summary";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { renderEstimationPdf } from "@/lib/export/pdf/render-estimation-pdf";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";
import type { ClientSummary } from "@/lib/summary/generate-client-summary";

type EstimationRow = {
  id: string;
  created_at: string;
  input: EstimationInput;
  result: EstimationResult;
  client_summary?: ClientSummary | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const estimation = data as EstimationRow;
  const clientSummary =
    estimation.client_summary ??
    generateClientSummary({
      input: estimation.input,
      result: estimation.result,
      modules: MODULE_CATALOG,
    });

  const buffer = await renderEstimationPdf({
    estimationId: estimation.id,
    createdAt: estimation.created_at,
    input: estimation.input,
    result: estimation.result,
    clientSummary,
  });

  const filename = `jitwise-estimate-${estimation.id.slice(0, 8)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
