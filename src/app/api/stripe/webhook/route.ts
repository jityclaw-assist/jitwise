import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/client";

function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase admin env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Must disable body parsing — Stripe needs the raw body to verify signature
export const config = { api: { bodyParser: false } };

async function updateUserPlan(
  supabaseUserId: string,
  plan: "free" | "pro",
  expiresAt: Date | null
) {
  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      plan,
      plan_expires_at: expiresAt?.toISOString() ?? null,
    })
    .eq("id", supabaseUserId);

  if (error) {
    console.error("[webhook] updateUserPlan error:", error);
  } else {
    console.log(`[webhook] updateUserPlan OK — userId=${supabaseUserId} plan=${plan}`);
  }
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id ?? null;
  console.log(`[webhook] getUserIdFromCustomer — customerId=${customerId} userId=${userId}`);
  return userId;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    console.error("[webhook] Missing stripe signature or webhook secret");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = await getUserIdFromCustomer(session.customer as string);
      console.log(`[webhook] checkout.session.completed — userId=${userId}`);

      if (userId) {
        await updateUserPlan(userId, "pro", null);
      } else {
        console.warn("[webhook] No userId found for customer, skipping plan update");
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        sub.metadata?.supabase_user_id ??
        (await getUserIdFromCustomer(sub.customer as string));

      console.log(`[webhook] ${event.type} — userId=${userId} status=${sub.status}`);

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

      console.log(`[webhook] customer.subscription.deleted — userId=${userId}`);

      if (userId) {
        await updateUserPlan(userId, "free", null);
      }
      break;
    }

    case "invoice.payment_failed": {
      console.log("[webhook] invoice.payment_failed — no action taken");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
