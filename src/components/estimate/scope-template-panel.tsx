"use client";

import { useMemo, useState } from "react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstimationInput } from "@/lib/schema/estimation";

type ScopeTemplatePanelProps = {
  estimationInput: EstimationInput;
  templateItems: string[];
  summaryMarkdown: string;
  advisorContent?: string;
  onRemoveItem?: (item: string) => void;
  onTemplateChange?: (content: string) => void;
};

const buildTemplateMarkdown = (
  estimationInput: EstimationInput,
  templateItems: string[]
) => {
  const lines: string[] = [];

  lines.push("SCOPE TEMPLATE");
  lines.push("");
  lines.push("Selected modules");
  estimationInput.modules.forEach((module) => {
    lines.push(`- ${module.moduleId} (${module.complexity})`);
  });

  if (templateItems.length > 0) {
    lines.push("");
    lines.push("Advisor follow-ups");
    templateItems.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  return lines.join("\n");
};

export function ScopeTemplatePanel({
  estimationInput,
  templateItems,
  summaryMarkdown,
  advisorContent,
  onRemoveItem,
  onTemplateChange,
}: ScopeTemplatePanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiTemplate, setAiTemplate] = useState<string>("");

  const templateText = useMemo(
    () => buildTemplateMarkdown(estimationInput, templateItems),
    [estimationInput, templateItems]
  );

  const activeTemplate = aiTemplate.length > 0 ? aiTemplate : templateText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeTemplate);
      setCopyState("copied");
      sileo.success({ title: "Template copied to clipboard." });
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      setCopyState("error");
      sileo.error({ title: "Could not copy to clipboard. Try again." });
    }
  };

  const handleExport = () => {
    const blob = new Blob([activeTemplate], {
      type: "text/markdown;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jitwise-scope-template.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
    sileo.success({ title: "Template exported as markdown." });
  };

  const handleGenerate = async () => {
    if (!summaryMarkdown) {
      setAiState("error");
      return;
    }

    setAiState("loading");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch("/api/templates/scope", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          input: estimationInput,
          summaryMarkdown,
          advisorItems: templateItems,
          advisorContent: advisorContent || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate template.");
      }

      const payload = (await response.json()) as { content?: string };
      if (payload.content) {
        setAiTemplate(payload.content);
        onTemplateChange?.(payload.content);
        sileo.success({ title: "Scope template generated." });
      }
      setAiState("idle");
    } catch (error) {
      setAiState("error");
      sileo.error({ title: "Template generation failed.", description: "Using the basic template." });
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Scope template
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            Generate a developer checklist
          </h2>
          <p className="text-sm text-muted-foreground">
            Combines selected modules with advisor follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copyState === "copied" ? "Copied" : "Copy template"}
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Export Markdown
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleGenerate}
          disabled={aiState === "loading" || summaryMarkdown.length === 0}
          aria-busy={aiState === "loading"}
        >
          {aiState === "loading" ? "Generating..." : "Generate from summary"}
        </Button>
        {!summaryMarkdown && (
          <span className="text-xs text-muted-foreground">
            Generate a client summary first to enable this.
          </span>
        )}
        {aiState === "error" && (
          <span className="text-xs text-destructive">
            Could not generate template. Using the basic template.
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background px-4 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Template preview
        </p>
        <div className="mt-3">
          <MarkdownRenderer content={activeTemplate} />
        </div>
        {copyState === "error" && (
          <p className="mt-2 text-xs text-destructive">
            Could not copy template. Try again.
          </p>
        )}
      </div>

      {templateItems.length > 0 && onRemoveItem && (
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Template items
          </p>
          <div className="flex flex-col gap-2">
            {templateItems.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
              >
                <span>{item}</span>
                <Button
                  variant="outline"
                  onClick={() => onRemoveItem(item)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
