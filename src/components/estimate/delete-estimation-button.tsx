"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DeleteEstimationButtonProps = {
  estimationId: string;
};

export function DeleteEstimationButton({
  estimationId,
}: DeleteEstimationButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this estimation? This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setStatus("deleting");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Missing session token");
      }

      const response = await fetch(`/api/estimations/${estimationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      router.push("/estimations");
      router.refresh();
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="destructive"
        type="button"
        onClick={handleDelete}
        disabled={status === "deleting"}
      >
        {status === "deleting" ? "Deleting..." : "Delete"}
      </Button>
      {status === "error" && (
        <span className="text-xs text-destructive">Delete failed.</span>
      )}
    </div>
  );
}
