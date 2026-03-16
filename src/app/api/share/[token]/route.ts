import { NextResponse } from "next/server";

import { MODULE_CATALOG } from "@/lib/catalog/modules";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

// Public endpoint — no authentication required
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("estimations")
    .select("id, created_at, input, result, client_summary, user_id")
    .eq("share_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const estimation = data as {
    id: string;
    created_at: string;
    user_id: string;
    input: {
      modules: { moduleId: string; complexity: string; provider?: string }[];
      riskLevel: string;
      urgencyLevel: string;
    };
    result: {
      hoursRange: { min: number; probable: number; max: number };
      pricingRange: { min: number; probable: number; max: number };
    };
    client_summary?: {
      summaryText?: string;
    } | null;
  };

  // Look up the owner's ref_token for share link attribution
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("ref_token")
    .eq("id", estimation.user_id)
    .maybeSingle();

  const ownerRefToken = (ownerProfile as { ref_token?: string | null } | null)?.ref_token ?? null;

  // Resolve module names in business-friendly format (no points, no hourlyRate)
  const modules = estimation.input.modules.map((selection) => {
    const catalogEntry = MODULE_CATALOG.find((m) => m.id === selection.moduleId);
    return {
      name: catalogEntry?.name ?? selection.moduleId,
      complexity: selection.complexity,
      provider: selection.provider ?? null,
    };
  });

  return NextResponse.json({
    id: estimation.id,
    createdAt: estimation.created_at,
    modules,
    riskLevel: estimation.input.riskLevel,
    urgencyLevel: estimation.input.urgencyLevel,
    hoursRange: estimation.result.hoursRange,
    pricingRange: estimation.result.pricingRange,
    summaryText: estimation.client_summary?.summaryText ?? null,
    ownerRefToken,
  });
}
