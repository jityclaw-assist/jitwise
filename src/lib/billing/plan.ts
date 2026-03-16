import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserPlan = {
  plan: "free" | "pro";
  isProActive: boolean;
  advisorUsesLeft: number | null; // null = unlimited (pro)
  estimationCount: number;
  atEstimationLimit: boolean;
};

/**
 * Fetches the user's plan details and enforces lazy monthly reset
 * for the advisor usage counter.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "plan, plan_expires_at, advisor_uses_this_month, advisor_month_reset"
    )
    .eq("id", userId)
    .single();

  const { count: estimationCount } = await supabase
    .from("estimations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const plan = (profile?.plan ?? "free") as "free" | "pro";
  const planExpiresAt = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at)
    : null;

  const isProActive =
    plan === "pro" ||
    (planExpiresAt !== null && planExpiresAt > new Date());

  // Lazy reset: if advisor_month_reset is from a previous month, reset counter
  let advisorUsesThisMonth = profile?.advisor_uses_this_month ?? 0;
  const lastReset = profile?.advisor_month_reset
    ? new Date(profile.advisor_month_reset)
    : null;
  const now = new Date();
  if (
    lastReset &&
    (lastReset.getFullYear() < now.getFullYear() ||
      lastReset.getMonth() < now.getMonth())
  ) {
    advisorUsesThisMonth = 0;
    // Fire-and-forget reset — don't block the response
    void supabase
      .from("profiles")
      .update({
        advisor_uses_this_month: 0,
        advisor_month_reset: now.toISOString().split("T")[0],
      })
      .eq("id", userId);
  }

  const FREE_ADVISOR_LIMIT = 3;
  const FREE_ESTIMATION_LIMIT = 3;

  const advisorUsesLeft = isProActive
    ? null
    : Math.max(0, FREE_ADVISOR_LIMIT - advisorUsesThisMonth);

  const count = estimationCount ?? 0;

  return {
    plan,
    isProActive,
    advisorUsesLeft,
    estimationCount: count,
    atEstimationLimit: !isProActive && count >= FREE_ESTIMATION_LIMIT,
  };
}

/**
 * Increments the advisor usage counter for a free user.
 * Should be called after a successful advisor API call.
 */
export async function incrementAdvisorUse(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("increment_advisor_uses", { uid: userId });
}
