import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Must disable body parsing — Stripe needs the raw body to verify signature
export const config = { api: { bodyParser: false } };

async function updateUserPlan(
  supabaseUserId: string,
  plan: "free" | "pro",
  expiresAt: Date | null
) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("profiles")
    .update({
      plan,
      plan_expires_at: expiresAt?.toISOString() ?? null,
    })
    .eq("id", supabaseUserId);
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer as Stripe.Customer).metadata?.supabase_user_id ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      // subscription metadata is set on the subscription itself, not the session
      const userId = await getUserIdFromCustomer(session.customer as string);

      if (userId) {
        // Subscription starts immediately on checkout completion
        await updateUserPlan(userId, "pro", null);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        sub.metadata?.supabase_user_id ??
        (await getUserIdFromCustomer(sub.customer as string));

      if (!userId) break;

      const isActive = sub.status === "active" || sub.status === "trialing";
      const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);

      await updateUserPlan(userId, isActive ? "pro" : "free", isActive ? periodEnd : null);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        sub.metadata?.supabase_user_id ??
        (await getUserIdFromCustomer(sub.customer as string));

      if (userId) {
        await updateUserPlan(userId, "free", null);
      }
      break;
    }

    case "invoice.payment_failed": {
      // Payment failed — keep pro until period end (Stripe handles retries)
      // No action needed here; subscription.updated will fire on final failure
      break;
    }
  }

  return NextResponse.json({ received: true });
}
