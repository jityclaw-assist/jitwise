import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Activate the referral for `referredUserId` (if any) and reward the referrer.
 * Call this after the referred user saves their first estimation.
 * Non-throwing — all errors are silently ignored to avoid blocking the main flow.
 */
export async function activateReferral(
  supabase: SupabaseClient,
  referredUserId: string
): Promise<void> {
  try {
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", referredUserId)
      .eq("status", "pending_activation")
      .maybeSingle();

    if (!referral) return;

    const ref = referral as { id: string; referrer_id: string };

    await supabase
      .from("referrals")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("id", ref.id);

    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("plan_expires_at")
      .eq("id", ref.referrer_id)
      .single();

    if (referrerProfile) {
      const currentExpiry = (referrerProfile as { plan_expires_at: string | null }).plan_expires_at;
      const baseDate =
        currentExpiry && new Date(currentExpiry) > new Date()
          ? new Date(currentExpiry)
          : new Date();
      baseDate.setDate(baseDate.getDate() + 30);

      await supabase
        .from("profiles")
        .update({ plan: "pro", plan_expires_at: baseDate.toISOString() })
        .eq("id", ref.referrer_id);

      await supabase
        .from("referrals")
        .update({ status: "rewarded" })
        .eq("id", ref.id);
    }
  } catch {
    // Non-blocking
  }
}
