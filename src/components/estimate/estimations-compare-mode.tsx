"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sileo } from "sileo";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type EstimationItem = {
  id: string;
  createdAt: string;
  moduleCount: number;
  riskLevel: string;
  urgencyLevel: string;
  probableHours: number;
  summaryPreview: string;
};

type EstimationsCompareModeProps = {
  estimations: EstimationItem[];
};

export function EstimationsCompareMode({ estimations }: EstimationsCompareModeProps) {
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((s) => s !== id));
    } else {
      if (selected.length >= 3) {
        sileo.error({ title: "Maximum 3 estimations for comparison." });
        return;
      }
      setSelected((prev) => [...prev, id]);
    }
  };

  const handleCompare = () => {
    if (selected.length < 2) return;
    router.push(`/estimations/compare?ids=${selected.join(",")}`);
  };

  const exitCompare = () => {
    setCompareMode(false);
    setSelected([]);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("No session");

      const res = await fetch(`/api/estimations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed");

      sileo.success({ title: "Estimation deleted." });
      setConfirmDeleteId(null);
      router.refresh();
    } catch {
      sileo.error({ title: "Could not delete estimation." });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (v: string) =>
    new Date(v).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-4">
      {/* Compare toggle button */}
      {estimations.length >= 2 && (
        <div className="flex justify-end">
          {compareMode ? (
            <button
              onClick={exitCompare}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel comparison
            </button>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
            >
              Compare estimations
            </button>
          )}
        </div>
      )}

      {/* Estimation cards */}
      <div className="grid gap-4">
        {estimations.map((e) => {
          const isSelected = selected.includes(e.id);
          const card = (
            <div
              className={[
                "rounded-xl border bg-card p-5 text-sm transition",
                compareMode
                  ? isSelected
                    ? "border-foreground/40 bg-foreground/5"
                    : "cursor-pointer border-border hover:border-foreground/20 hover:bg-foreground/5"
                  : "border-border",
              ].join(" ")}
              onClick={compareMode ? () => toggleItem(e.id) : undefined}
              role={compareMode ? "checkbox" : undefined}
              aria-checked={compareMode ? isSelected : undefined}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {compareMode && (
                    <div
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {formatDate(e.createdAt)}
                    </p>
                    <p className="mt-2 font-semibold text-foreground">
                      {e.moduleCount} modules
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Risk: {e.riskLevel} / Urgency: {e.urgencyLevel}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Probable</p>
                    <p className="text-sm font-semibold">
                      {Math.round(e.probableHours)} hrs
                    </p>
                  </div>
                  {!compareMode && (
                    confirmDeleteId === e.id ? (
                      <div className="flex items-center gap-1.5" onClick={(ev) => ev.preventDefault()}>
                        <span className="text-xs text-muted-foreground">Delete?</span>
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                          className="rounded px-2 py-0.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {deletingId === e.id ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-foreground/5"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(ev) => { ev.preventDefault(); setConfirmDeleteId(e.id); }}
                        className="rounded p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete estimation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Client summary preview
                </p>
                <p className="mt-2 whitespace-pre-line">{e.summaryPreview}</p>
              </div>
            </div>
          );

          // In compare mode the whole card is clickable; in normal mode wrap with Link
          return compareMode ? (
            <div key={e.id}>{card}</div>
          ) : (
            <Link key={e.id} href={`/estimations/${e.id}`}>
              {card}
            </Link>
          );
        })}
      </div>

      {/* Sticky compare banner */}
      {compareMode && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-lg">
            <p className="text-sm text-muted-foreground">
              {selected.length === 0
                ? "Select 2 or 3 estimations to compare"
                : selected.length === 1
                  ? "1 of 2 selected — select one more"
                  : `${selected.length} selected`}
            </p>
            {selected.length >= 2 && (
              <button
                onClick={handleCompare}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Compare {selected.length}
              </button>
            )}
            {selected.length < 3 && selected.length >= 2 && (
              <span className="text-xs text-muted-foreground">or select one more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
