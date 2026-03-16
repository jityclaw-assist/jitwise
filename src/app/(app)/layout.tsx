import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/shared/app-nav";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthenticatedSupabase();

  if (auth) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "";
    const isOnboardingRoute = pathname === "/onboarding";

    if (!isOnboardingRoute) {
      const { supabase, user } = auth;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarding_completed) {
        const { count } = await supabase
          .from("estimations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if ((count ?? 0) === 0) {
          redirect("/onboarding");
        }
      }
    }
  }

  return (
    <div className="min-h-screen w-full relative text-slate-100 dark">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at top, #1c1c1c, #000000)",
        }}
      />
      <div className="relative z-10">
        <AppNav />
        <div className="mx-auto w-full max-w-5xl px-6 pb-16">{children}</div>
      </div>
    </div>
  );
}
