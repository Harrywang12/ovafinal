import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "./supabase";
import { assertEnv } from "./utils";

export type AdminAuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export async function isAdminEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  if (getConfiguredAdminEmails().includes(normalizedEmail)) {
    return true;
  }

  try {
    const { data, error } = await getServerSupabase()
      .from("admin_users")
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}

export async function getRequestIdentity(request: Request): Promise<AdminAuthResult> {
  assertEnv(["SUPABASE_URL"]);

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization bearer token" };
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    return { ok: false, status: 500, error: "Missing SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)" };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: error?.message || "Invalid token" };
  }

  const email = normalizeEmail(data.user.email || "");
  if (!email) {
    return { ok: false, status: 403, error: "An email address is required for admin access" };
  }

  return { ok: true, userId: data.user.id, email };
}

/**
 * Validates the bearer token and checks both the database-backed admin list
 * and the comma-separated ADMIN_EMAILS bootstrap list.
 */
export async function requireAdminFromRequest(request: Request): Promise<AdminAuthResult> {
  const identity = await getRequestIdentity(request);
  if (!identity.ok) return identity;

  if (!(await isAdminEmail(identity.email))) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return identity;
}
