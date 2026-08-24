import { NextResponse } from "next/server";
import { safeAuthCallbackRedirectPath } from "../../../lib/safe-redirect";
import { getRequestSupabase } from "../../../lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeAuthCallbackRedirectPath(url.searchParams.get("next"));
  const isPasswordRecovery = new URL(next, url.origin).pathname === "/reset-password";

  if (code) {
    const { error } = await (await getRequestSupabase()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  if (isPasswordRecovery) {
    return NextResponse.redirect(new URL("/reset-password?error=invalid_link", url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
