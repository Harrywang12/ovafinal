import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "../../../../lib/supabase";
import { assertEnv } from "../../../../lib/utils";
import { requireAdminFromRequest } from "../../../../lib/admin";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for upload processing

/**
 * POST /api/admin/upload-video
 * Multipart form-data: file=@clip.mp4
 * Uploads to Supabase Storage bucket `practice-clips`.
 */
export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);

  const admin = await requireAdminFromRequest(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error: "Invalid Content-Type. Expected multipart/form-data for file upload.",
        hint: "Use FormData in the browser or curl with -F file=@...",
      },
      { status: 415 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `videos/${crypto.randomUUID()}-${safeName}`;

  const supabase = getServerSupabase();
  const { data, error } = await supabase.storage
    .from("practice-clips")
    .upload(path, buffer, { contentType: file.type || "video/mp4", upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("practice-clips").getPublicUrl(data.path);

  return NextResponse.json({
    bucket: "practice-clips",
    path: data.path,
    publicUrl: urlData.publicUrl,
  });
}
