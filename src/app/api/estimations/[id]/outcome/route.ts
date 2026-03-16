import { NextResponse } from "next/server";

import { EstimationOutcomeInputSchema } from "@/lib/schema/estimation-outcome";
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
    .from("estimation_outcomes")
    .select(
      "id, actual_hours, actual_cost, completed_at, notes, created_at, updated_at"
    )
    .eq("estimation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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
  const body = (await request.json()) as { input?: unknown };
  const parsedInput = EstimationOutcomeInputSchema.safeParse(body.input);

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsedInput.error.flatten() },
      { status: 400 }
    );
  }

  const { supabase, user } = auth;
  const outcome = parsedInput.data;

  const { data, error } = await supabase
    .from("estimation_outcomes")
    .upsert(
      {
        estimation_id: id,
        user_id: user.id,
        actual_hours: outcome.actualHours ?? null,
        actual_cost: outcome.actualCost ?? null,
        completed_at: outcome.completedAt ?? null,
        notes: outcome.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "estimation_id" }
    )
    .select(
      "id, actual_hours, actual_cost, completed_at, notes, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
