"use client";

import { Link2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";

import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ShareButtonProps = {
  estimationId: string;
};

type ShareState = "idle" | "loading" | "active";

export function ShareButton({ estimationId }: ShareButtonProps) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
        setRevokeConfirm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const getToken = async (): Promise<string | null> => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return null;
    return accessToken;
  };

  const handleOpen = async () => {
    if (popoverOpen) {
      setPopoverOpen(false);
      setRevokeConfirm(false);
      return;
    }

    // If already active, just open the popover
    if (shareState === "active" && shareUrl) {
      setPopoverOpen(true);
      return;
    }

    // Generate token automatically on first open
    setShareState("loading");
    const accessToken = await getToken();
    if (!accessToken) {
      sileo.error({ title: "Session expired. Please refresh." });
      setShareState("idle");
      return;
    }

    try {
      const res = await fetch(`/api/estimations/${estimationId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 403) {
        setShareState("idle");
        setUpgradeModalOpen(true);
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const payload = (await res.json()) as { url: string };
      setShareUrl(payload.url);
      setShareState("active");
      setPopoverOpen(true);
    } catch {
      sileo.error({ title: "Could not generate share link." });
      setShareState("idle");
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      sileo.success({ title: "Link copied to clipboard." });
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      sileo.error({ title: "Could not copy link." });
    }
  };

  const handleRevoke = async () => {
    const accessToken = await getToken();
    if (!accessToken) return;
    try {
      await fetch(`/api/estimations/${estimationId}/share`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setShareUrl(null);
      setShareState("idle");
      setPopoverOpen(false);
      setRevokeConfirm(false);
      sileo.success({ title: "Share link revoked." });
    } catch {
      sileo.error({ title: "Could not revoke link." });
    }
  };

  return (
    <>
    {upgradeModalOpen && (
      <UpgradeModal feature="share_link" onClose={() => setUpgradeModalOpen(false)} />
    )}
    <div className="relative" ref={popoverRef}>
      <button
        onClick={handleOpen}
        disabled={shareState === "loading"}
        className={[
          "flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold transition",
          shareState === "active"
            ? "border-green-500/40 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-950/20 dark:text-green-400"
            : "border-border text-foreground hover:bg-foreground/5",
          shareState === "loading" ? "opacity-60" : "",
        ].join(" ")}
      >
        <Link2 className="h-3.5 w-3.5" />
        {shareState === "loading"
          ? "Generating…"
          : shareState === "active"
            ? "Shared"
            : "Share"}
        {shareState === "active" && (
          <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
        )}
      </button>

      {popoverOpen && shareUrl && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Share link
            </p>
            <button
              onClick={() => { setPopoverOpen(false); setRevokeConfirm(false); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={handleCopy}>
                {copyState === "copied" ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anyone with this link can view the client summary without logging in.
            </p>

            <div className="mt-4 border-t border-border pt-4">
              {!revokeConfirm ? (
                <button
                  onClick={() => setRevokeConfirm(true)}
                  className="text-xs font-medium text-destructive hover:underline"
                >
                  Revoke link
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Anyone with the current link will lose access immediately.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setRevokeConfirm(false)}>
                      Cancel
                    </Button>
                    <button
                      onClick={handleRevoke}
                      className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
