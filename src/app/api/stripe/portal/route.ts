import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/client";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

// POST — redirect to Stripe Customer Portal for subscription management
export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = (profile as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
