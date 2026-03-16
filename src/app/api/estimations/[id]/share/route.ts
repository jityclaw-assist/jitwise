import { NextResponse } from "next/server";

import { getUserPlan } from "@/lib/billing/plan";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

// POST — generate (or regenerate) a share token
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { id } = await params;

  // Share links are a Pro feature
  const userPlan = await getUserPlan(user.id);
  if (!userPlan.isProActive) {
    return NextResponse.json(
      { error: "upgrade_required", feature: "share_link" },
      { status: 403 }
    );
  }

  // Verify ownership
  const { data: estimation, error: fetchError } = await supabase
    .from("estimations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !estimation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error: updateError } = await supabase
    .from("estimations")
    .update({ share_token: token })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to generate share token" }, { status: 500 });
  }

  // Lazily generate a permanent ref_token for the user if they don't have one yet
  const { data: profile } = await supabase
    .from("profiles")
    .select("ref_token")
    .eq("id", user.id)
    .single();

  if (profile && !profile.ref_token) {
    const refToken = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await supabase.from("profiles").update({ ref_token: refToken }).eq("id", user.id);
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/share/${token}`;
  return NextResponse.json({ token, url });
}

// DELETE — revoke the share token
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("estimations")
    .update({ share_token: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET — return current share token status (for loading the popover)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("estimations")
    .select("share_token")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = (data as { share_token: string | null }).share_token;
  const url = token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${token}`
    : null;

  return NextResponse.json({ token, url });
}
