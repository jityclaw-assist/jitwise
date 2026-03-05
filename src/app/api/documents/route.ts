import { NextResponse } from "next/server";

import { getAuthenticatedSupabaseFromRequest } from "@/lib/supabase/server";

const BUCKET = "jitwise-documents";

const buildStoragePath = (
  userId: string,
  estimationId: string | null,
  documentId: string,
  fileName: string
) => {
  const safeName = fileName.replace(/[^\w.\- ]/g, "_");
  if (estimationId) {
    return `user/${userId}/estimation/${estimationId}/${documentId}/${safeName}`;
  }
  return `user/${userId}/misc/${documentId}/${safeName}`;
};

export async function GET(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { searchParams } = new URL(request.url);
  const estimationId = searchParams.get("estimationId");

  if (!estimationId) {
    return NextResponse.json(
      { error: "Missing estimationId" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, original_name, storage_path, mime_type, size_bytes, created_at"
    )
    .eq("user_id", user.id)
    .eq("estimation_id", estimationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user } = auth;
  const formData = await request.formData();
  const title = formData.get("title");
  const estimationId = formData.get("estimationId");
  const file = formData.get("file");

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  if (typeof estimationId !== "string" || estimationId.length === 0) {
    return NextResponse.json(
      { error: "Missing estimationId" },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath(
    user.id,
    estimationId,
    documentId,
    file.name
  );

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      user_id: user.id,
      estimation_id: estimationId,
      title: title.trim(),
      original_name: file.name,
      bucket: BUCKET,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select(
      "id, title, original_name, storage_path, mime_type, size_bytes, created_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
