import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export default async function LoginPage() {
  const auth = await getAuthenticatedSupabase();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/50 p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-jityellow">
          Jitwise Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Sign in to the estimation workspace
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Create an account or log in to manage your saved estimates.
        </p>
        <div className="mt-8">
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
