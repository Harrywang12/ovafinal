import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
  const supabase = getServerSupabase();

  // Validate Content-Type header
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error: "Invalid Content-Type. Expected multipart/form-data for file upload.",
        hint: "Use FormData or curl with -F flag",
      },
      { status: 415 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 }
    );
  }
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `rules/${crypto.randomUUID()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("rules")
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: data?.path, bucket: "rules" });
}
