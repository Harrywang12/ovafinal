import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "./lib/safe-redirect";

const PROTECTED_PREFIXES = ["/dashboard", "/quiz", "/learn", "/practice", "/challenge", "/admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", safeRedirectPath(`${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    const destination = request.nextUrl.clone();
    const nextPath = safeRedirectPath(request.nextUrl.searchParams.get("next"));
    destination.pathname = nextPath.split(/[?#]/)[0];
    destination.search = nextPath.includes("?") ? `?${nextPath.split("?")[1].split("#")[0]}` : "";
    return NextResponse.redirect(destination);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|txt)$).*)",
  ],
};
