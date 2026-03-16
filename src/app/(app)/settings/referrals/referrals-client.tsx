"use client";

import { useState } from "react";

type Referral = {
  id: string;
  status: string;
  created_at: string;
  activated_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  pending_activation: "Registered — awaiting first estimate",
  activated: "Activated",
  rewarded: "Rewarded",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  pending_activation: "text-blue-400",
  activated: "text-emerald-400",
  rewarded: "text-emerald-400 font-semibold",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function ReferralsClient({
  refToken,
  referrals,
}: {
  refToken: string | null;
  referrals: Referral[];
}) {
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const referralUrl = refToken
    ? `${appUrl}/login?ref=${refToken}&utm_source=referral&utm_medium=settings`
    : null;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!referralUrl || !navigator.share) return;
    navigator.share({
      title: "Try Jitwise — free project estimation tool",
      text: "I use Jitwise to create structured project estimates for clients. Try it free:",
      url: referralUrl,
    });
  };

  const rewardedCount = referrals.filter((r) => r.status === "rewarded").length;
  const totalReferred = referrals.length;

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Referral link card */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Your referral link</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rewardedCount > 0
              ? `${totalReferred} freelancer${totalReferred !== 1 ? "s" : ""} referred · ${rewardedCount} month${rewardedCount !== 1 ? "s" : ""} of Pro earned`
              : "No referrals yet. Share your link and earn Pro months for free."}
          </p>
        </div>

        {referralUrl ? (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralUrl}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground font-mono outline-none select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            {"share" in navigator && (
              <button
                onClick={handleShare}
                className="shrink-0 rounded-lg border border-border bg-foreground/5 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
              >
                Share
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your referral link will be generated the first time you share an estimate. Create a share link from any estimation to activate it.
          </p>
        )}
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">History</p>
          <div className="flex flex-col gap-2">
            {referrals.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${STATUS_COLORS[r.status] ?? "text-muted-foreground"}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                  {r.status === "rewarded" && r.activated_at && (
                    <span className="text-xs text-muted-foreground">
                      Earned on {formatDate(r.activated_at)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
