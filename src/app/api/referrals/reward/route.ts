import { NextResponse } from "next/server";

import { activateReferral } from "@/lib/referrals/activate-referral";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

// POST — manually trigger referral reward (e.g. for debugging / admin use)
export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await activateReferral(auth.supabase, auth.user.id);
  return NextResponse.json({ ok: true });
}
