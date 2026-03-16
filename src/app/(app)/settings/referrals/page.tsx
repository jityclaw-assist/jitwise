import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReferralsClient } from "./referrals-client";

export default async function ReferralsPage() {
  const auth = await getAuthenticatedSupabase();
  if (!auth) redirect("/login");

  const { supabase, user } = auth;

  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from("profiles").select("ref_token").eq("id", user.id).single(),
    supabase
      .from("referrals")
      .select("id, status, created_at, activated_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const refToken = (profile as { ref_token: string | null } | null)?.ref_token ?? null;

  return (
    <main className="flex flex-col gap-10 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Settings
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">Refer &amp; earn</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Share Jitwise with a freelancer colleague. When they save their first estimate, you get 1 month of Pro free.
          </p>
        </div>
      </header>
      <ReferralsClient
        refToken={refToken}
        referrals={(referrals ?? []) as { id: string; status: string; created_at: string; activated_at: string | null }[]}
      />
    </main>
  );
}
