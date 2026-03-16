import { NextResponse } from "next/server";

import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

// POST — claim a referral: associate the newly registered user with a ref_token
export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const body = (await request.json()) as { refToken?: string };
  const { refToken } = body;

  if (!refToken) {
    return NextResponse.json({ error: "Missing refToken" }, { status: 400 });
  }

  // Find the referrer's profile by ref_token
  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("ref_token", refToken)
    .maybeSingle();

  if (!referrerProfile) {
    return NextResponse.json({ error: "Invalid ref token" }, { status: 404 });
  }

  const referrerId = (referrerProfile as { id: string }).id;

  // Don't allow self-referral
  if (referrerId === user.id) {
    return NextResponse.json({ ok: true });
  }

  // Check if this user was already referred
  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existingReferral) {
    return NextResponse.json({ ok: true }); // Already claimed
  }

  // Create a new referral record associating referred user with referrer
  await supabase.from("referrals").insert({
    referrer_id: referrerId,
    referred_id: user.id,
    ref_token: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    status: "pending_activation",
  });

  return NextResponse.json({ ok: true });
}
