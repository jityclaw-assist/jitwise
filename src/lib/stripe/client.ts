import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
