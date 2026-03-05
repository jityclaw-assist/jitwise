import { NextResponse } from "next/server";

import { calculateEstimation } from "@/lib/engine/calculate-estimation";
import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { generateClientSummary } from "@/lib/summary";
import {
  EstimationInputSchema,
  type EstimationInput,
} from "@/lib/schema/estimation";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

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

  const body = (await request.json()) as { input?: EstimationInput };
  const parsedInput = EstimationInputSchema.safeParse(body.input);

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const estimationInput = parsedInput.data;
  const estimationResult = calculateEstimation(estimationInput);
  const clientSummary = generateClientSummary({
    input: estimationInput,
    result: estimationResult,
    modules: MODULE_CATALOG,
  });

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

  return NextResponse.json({ id: data.id });
}
