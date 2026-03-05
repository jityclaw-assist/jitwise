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
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({
            email,
            password,
          })
        : await supabase.auth.signUp({
            email,
            password,
          });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage(
      mode === "signup"
        ? "Account created. Check your email if confirmation is required."
        : "Signed in."
    );
    router.push("/dashboard");
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
