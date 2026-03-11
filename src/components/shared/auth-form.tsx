"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

const MODE_LABELS: Record<Mode, string> = {
  login: "Sign in",
  signup: "Create account",
};

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        // Email confirmation required — user is not yet logged in
        setStatus("success");
        setMessage("Account created. Check your email to confirm before signing in.");
        return;
      }

      // Auto-confirmed — send them to create their first estimate
      router.push("/estimate");
      router.refresh();
      return;
    }

    // Login flow
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    // Check if this user has any saved estimations to pick the right landing
    const { count } = await supabase
      .from("estimations")
      .select("id", { count: "exact", head: true });

    router.push(count && count > 0 ? "/estimations" : "/estimate");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
        {(["login", "signup"] as Mode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`flex-1 rounded-full px-4 py-2 transition ${
              mode === tab
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {MODE_LABELS[tab]}
          </button>
        ))}
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder="you@company.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder="••••••••"
          />
        </label>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Working..." : MODE_LABELS[mode]}
        </Button>
      </form>
      {message && (
        <p
          className={`text-xs ${
            status === "error" ? "text-red-300" : "text-white/70"
          }`}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      )}
    </div>
  );
}
