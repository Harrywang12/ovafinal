import { NextResponse } from "next/server";
import { getAssignedWork } from "../../../lib/assigned-work";
import { requireUserFromRequest } from "../../../lib/auth";
import { getServerSupabase } from "../../../lib/supabase";
import { assertEnv } from "../../../lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertEnv(["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]);
    const user = await requireUserFromRequest(request);
    if (!user.ok) {
      return NextResponse.json(
        { code: user.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN", error: user.error },
        { status: user.status }
      );
    }
    return NextResponse.json(await getAssignedWork(getServerSupabase(), user.userId));
  } catch (error) {
    return NextResponse.json(
      { code: "ASSIGNED_WORK_FAILED", error: error instanceof Error ? error.message : "Failed to load assigned work" },
      { status: 500 }
    );
  }
}
