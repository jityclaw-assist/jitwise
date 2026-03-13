"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildJsonExport } from "@/lib/export/build-json-export";
import { buildMarkdownExport } from "@/lib/export/build-markdown-export";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClientSummary } from "@/lib/summary/generate-client-summary";
import type { EstimationInput, EstimationResult } from "@/lib/schema/estimation";

type ClientSummaryActionsProps = {
  summaryText: string;
  estimationId: string;
  createdAt: string;
  input: EstimationInput;
  result: EstimationResult;
  clientSummary: ClientSummary;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export function ClientSummaryActions({
  summaryText,
  estimationId,
  createdAt,
  input,
  result,
  clientSummary,
}: ClientSummaryActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "error">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  };

  const handleExportMarkdown = () => {
    const content = buildMarkdownExport({
      estimationId,
      createdAt,
      hourlyRate: input.hourlyRate,
      clientSummary,
    });
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    triggerDownload(blob, `jitwise-estimate-${estimationId.slice(0, 8)}.md`);
  };

  const handleExportJson = () => {
    const data = buildJsonExport({
      estimationId,
      createdAt,
      input,
      result,
      clientSummary,
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    triggerDownload(blob, `jitwise-estimate-${estimationId.slice(0, 8)}.json`);
  };

  const handleExportPdf = async () => {
    setPdfState("loading");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session");
      }

      const response = await fetch(
        `/api/estimations/${estimationId}/export/pdf`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      triggerDownload(blob, `jitwise-estimate-${estimationId.slice(0, 8)}.pdf`);
      setPdfState("idle");
    } catch {
      setPdfState("error");
      window.setTimeout(() => setPdfState("idle"), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleCopy}>
        {copyState === "copied" ? "Copied" : "Copy summary"}
      </Button>
      <Button variant="secondary" onClick={handleExportMarkdown}>
        Export Markdown
      </Button>
      <Button variant="secondary" onClick={handleExportJson}>
        Export JSON
      </Button>
      <Button
        variant="secondary"
        onClick={handleExportPdf}
        disabled={pdfState === "loading"}
      >
        {pdfState === "loading"
          ? "Generating PDF..."
          : pdfState === "error"
            ? "PDF failed"
            : "Export PDF"}
      </Button>
      {copyState === "error" && (
        <span className="text-xs text-destructive">Copy failed.</span>
      )}
    </div>
  );
}
