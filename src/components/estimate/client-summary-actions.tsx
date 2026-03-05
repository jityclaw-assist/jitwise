"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ClientSummaryActionsProps = {
  summaryText: string;
};

export function ClientSummaryActions({ summaryText }: ClientSummaryActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      setCopyState("error");
    }
  };

  const handleExport = () => {
    const blob = new Blob([summaryText], {
      type: "text/markdown;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jitwise-client-summary.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleCopy}>
        {copyState === "copied" ? "Copied" : "Copy summary"}
      </Button>
      <Button variant="secondary" onClick={handleExport}>
        Export Markdown
      </Button>
      {copyState === "error" && (
        <span className="text-xs text-destructive">Copy failed.</span>
      )}
    </div>
  );
}
