import { NextResponse } from "next/server";

import { EstimationInputSchema, EstimationResultSchema } from "@/lib/schema/estimation";
import { generateAiClientSummaryMarkdown } from "@/lib/summary/ai-client-summary";
import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    input?: unknown;
    result?: unknown;
    advisorContent?: string;
  };

  const parsedInput = EstimationInputSchema.safeParse(body.input);
  const parsedResult = EstimationResultSchema.safeParse(body.result);

  if (!parsedInput.success || !parsedResult.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const content = await generateAiClientSummaryMarkdown({
      input: parsedInput.data,
      result: parsedResult.data,
      advisorContent: body.advisorContent,
    });

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: "OpenAI request failed." },
      { status: 500 }
    );
  }
}
