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
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { supabase, user } = auth;
  const { error } = await supabase
    .from("estimations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = (await request.json()) as {
    input?: unknown;
    advisorContent?: string;
    summaryMarkdown?: string;
    templateContent?: string;
  };
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

  const advisorInsights = body.advisorContent
    ? extractAdvisorInsights(body.advisorContent)
    : undefined;

  let clientSummary = clientSummaryBase;

  if (body.summaryMarkdown) {
    // Use the content already generated and reviewed by the user — skip server-side AI call
    clientSummary = {
      ...clientSummaryBase,
      summaryText: body.summaryMarkdown,
      advisorInsights,
      advisorContent: body.advisorContent,
      templateContent: body.templateContent,
    };
  } else {
    try {
      const aiSummary = await generateAiClientSummaryMarkdown({
        input: estimationInput,
        result: estimationResult,
        modules: MODULE_CATALOG,
        advisorContent: body.advisorContent,
      });
      if (aiSummary.length > 0) {
        clientSummary = {
          ...clientSummaryBase,
          summaryText: aiSummary,
          advisorInsights,
          advisorContent: body.advisorContent,
          templateContent: body.templateContent,
        };
      } else if (advisorInsights) {
        clientSummary = { ...clientSummaryBase, advisorInsights, advisorContent: body.advisorContent };
      }
    } catch (error) {
      // fall back to deterministic summary
      clientSummary = {
        ...clientSummaryBase,
        advisorInsights,
        advisorContent: body.advisorContent,
        templateContent: body.templateContent,
      };
    }
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .update({
      input: estimationInput,
      result: estimationResult,
      client_summary: clientSummary,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
