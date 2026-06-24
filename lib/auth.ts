import { getServerSupabase } from "./supabase";
import {
  normalizeRefereeLevel,
  questionLevelForRefereeLevel,
  type RefereeLevel,
} from "./learning";

export type RequestUser =
  | {
      ok: true;
      userId: string;
      email: string | null;
      refereeLevel: RefereeLevel;
    }
  | { ok: false; status: number; error: string };

export async function requireUserFromRequest(request: Request): Promise<RequestUser> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const email = data.user.email ?? null;
  const metadataLevel = normalizeRefereeLevel(data.user.user_metadata?.referee_level);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("referee_level")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  const refereeLevel = normalizeRefereeLevel(profile?.referee_level ?? metadataLevel);

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      user_id: data.user.id,
      email,
      referee_level: refereeLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return { ok: false, status: 500, error: upsertError.message };
  }

  return {
    ok: true,
    userId: data.user.id,
    email,
    refereeLevel,
  };
}

export function requestUserQuestionLevel(user: Extract<RequestUser, { ok: true }>) {
  return questionLevelForRefereeLevel(user.refereeLevel);
}
