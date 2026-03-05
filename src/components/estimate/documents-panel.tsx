"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DocumentItem = {
  id: string;
  title: string;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type DocumentsPanelProps = {
  estimationId: string;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatBytes = (value: number | null) => {
  if (!value) {
    return "Unknown size";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export function DocumentsPanel({ estimationId }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canUpload = title.trim().length > 0 && Boolean(file) && !isUploading;

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [documents]
  );

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch(
        `/api/documents?estimationId=${encodeURIComponent(estimationId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load documents");
      }

      const payload = (await response.json()) as { data: DocumentItem[] };
      setDocuments(payload.data ?? []);
    } catch (err) {
      setError("Could not load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [estimationId]);

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("estimationId", estimationId);
      formData.append("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload");
      }

      const payload = (await response.json()) as { data: DocumentItem };
      setDocuments((current) => [payload.data, ...current]);
      setTitle("");
      setFile(null);
    } catch (err) {
      setError("Upload failed. Check your file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sign");
      }

      const payload = (await response.json()) as { url: string };
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError("Download failed. Try again.");
    }
  };

  const handleDelete = async (documentId: string) => {
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      setDocuments((current) =>
        current.filter((doc) => doc.id !== documentId)
      );
    } catch (err) {
      setError("Delete failed. Try again.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Documents
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            Attach supporting files
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_3fr]">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Upload
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              placeholder="Title (e.g. Product requirements)"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              type="file"
              className="text-sm"
              onChange={(event) =>
                setFile(event.target.files ? event.target.files[0] : null)
              }
            />
            <Button
              variant="secondary"
              disabled={!canUpload}
              onClick={handleUpload}
            >
              {isUploading ? "Uploading..." : "Upload document"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Attached files
          </p>
          <div className="mt-3 flex flex-col gap-3 text-sm">
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && sortedDocuments.length === 0 && (
              <p className="text-muted-foreground">No documents attached yet.</p>
            )}
            {!isLoading &&
              sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.original_name} • {formatBytes(doc.size_bytes)} •{" "}
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(doc.id)}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(doc.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  );
}
