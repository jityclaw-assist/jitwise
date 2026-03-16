import { NextResponse } from "next/server";

import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length < 2 || ids.length > 3) {
    return NextResponse.json(
      { error: "Provide 2 or 3 estimation IDs." },
      { status: 400 }
    );
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary")
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch estimations." }, { status: 500 });
  }

  // Ensure all requested IDs belong to this user
  if ((data ?? []).length !== ids.length) {
    return NextResponse.json({ error: "One or more estimations not found." }, { status: 404 });
  }

  // Return in the same order as requested
  const byId = new Map((data ?? []).map((e) => [e.id, e]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  return NextResponse.json({ data: ordered });
}
