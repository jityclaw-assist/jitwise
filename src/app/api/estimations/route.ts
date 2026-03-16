import { NextResponse } from "next/server";

import { getUserPlan } from "@/lib/billing/plan";
import { calculateEstimation } from "@/lib/engine/calculate-estimation";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { generateAiClientSummaryMarkdown } from "@/lib/summary/ai-client-summary";
import { generateClientSummary } from "@/lib/summary";
import { extractAdvisorInsights } from "@/lib/summary/extract-advisor-sections";
import {
  EstimationInputSchema,
  type EstimationInput,
} from "@/lib/schema/estimation";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";
import { activateReferral } from "@/lib/referrals/activate-referral";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Enforce free plan estimation limit
  const userPlan = await getUserPlan(auth.user.id);
  if (userPlan.atEstimationLimit) {
    return NextResponse.json(
      { error: "limit_reached", limit: "estimations", current: userPlan.estimationCount },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    input?: EstimationInput;
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

  const isFirstEstimation = userPlan.estimationCount === 0;

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .insert({
      user_id: user.id,
      input: estimationInput,
      result: estimationResult,
      client_summary: clientSummary,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isFirstEstimation) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    // Activate any pending referral and reward the referrer (non-blocking)
    activateReferral(supabase, user.id).catch(() => {});
  }

  return NextResponse.json({ id: data.id });
}
