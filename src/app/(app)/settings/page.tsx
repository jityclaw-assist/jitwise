import { redirect } from "next/navigation";

import { getUserPlan } from "@/lib/billing/plan";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { PlanCard } from "./plan-card";

export default async function SettingsPage() {
  const auth = await getAuthenticatedSupabase();
  if (!auth) redirect("/login");

  const userPlan = await getUserPlan(auth.user.id);

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("stripe_customer_id, plan_expires_at")
    .eq("id", auth.user.id)
    .single();

  const hasStripeCustomer = !!(profile as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id;

  const planExpiresAt = (profile as { plan_expires_at?: string | null } | null)
    ?.plan_expires_at ?? null;

  return (
    <main className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Plan & Billing</h1>
      </header>
      <PlanCard
        plan={userPlan.plan}
        isProActive={userPlan.isProActive}
        hasStripeCustomer={hasStripeCustomer}
        planExpiresAt={planExpiresAt}
        estimationCount={userPlan.estimationCount}
        advisorUsesLeft={userPlan.advisorUsesLeft}
      />
    </main>
  );
}
