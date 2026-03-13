import { NextResponse } from "next/server";

import { calculateEstimation } from "@/lib/engine/calculate-estimation";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { generateAiClientSummaryMarkdown } from "@/lib/summary/ai-client-summary";
import { generateClientSummary } from "@/lib/summary";
import { extractAdvisorInsights } from "@/lib/summary/extract-advisor-sections";
import { EstimationInputSchema } from "@/lib/schema/estimation";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { error } = await supabase
    .from("estimations")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { input?: unknown; advisorContent?: string };
  const parsedInput = EstimationInputSchema.safeParse(body.input);

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const estimationInput = parsedInput.data;
  const estimationResult = calculateEstimation(estimationInput);
  const clientSummaryBase = generateClientSummary({
    input: estimationInput,
    result: estimationResult,
    modules: MODULE_CATALOG,
  });
  let clientSummary = clientSummaryBase;

  const advisorInsights = body.advisorContent
    ? extractAdvisorInsights(body.advisorContent)
    : undefined;

  try {
    const aiSummary = await generateAiClientSummaryMarkdown({
      input: estimationInput,
      result: estimationResult,
      modules: MODULE_CATALOG,
      advisorContent: body.advisorContent,
    });
    if (aiSummary.length > 0) {
      clientSummary = { ...clientSummaryBase, summaryText: aiSummary, advisorInsights };
    }
  } catch (error) {
    // fall back to deterministic summary
    if (advisorInsights) clientSummary = { ...clientSummaryBase, advisorInsights };
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .update({
      input: estimationInput,
      result: estimationResult,
      client_summary: clientSummary,
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
