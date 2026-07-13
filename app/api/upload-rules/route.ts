import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "../../../lib/admin";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
    const admin = await requireAdminFromRequest(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
    if (!(request.headers.get("content-type") || "").includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 415 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF rulebooks are accepted" }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be between 1 byte and 25 MB" }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "The uploaded file is not a valid PDF" }, { status: 415 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `rules/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await getServerSupabase().storage.from("rules").upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (error) throw error;
    return NextResponse.json({ path: data.path, bucket: "rules", originalName: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rulebook upload failed" }, { status: 500 });
  }
}
