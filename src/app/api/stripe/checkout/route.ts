import { NextResponse } from "next/server";

import { stripe, STRIPE_PRO_PRICE_ID } from "@/lib/stripe/client";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

// POST — create a Stripe Checkout session for the Pro plan
export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;

  if (!STRIPE_PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 }
    );
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = (profile as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
