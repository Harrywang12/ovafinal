import { createClient } from "@supabase/supabase-js";
import { assertEnv } from "./utils";

export const ADMIN_EMAIL = "yixuanwang2009@gmail.com";

export type AdminAuthResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; status: number; error: string };

/**
 * Validates a Supabase JWT from the Authorization header and ensures the user is the configured admin.
 *
 * This is used by admin API routes that also use the service role key for database writes.
 */
export async function requireAdminFromRequest(request: Request): Promise<AdminAuthResult> {
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

  // Use anon client to validate the JWT and fetch user identity
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

  const email = (data.user.email || "").toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, userId: data.user.id, email };
}
