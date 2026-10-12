import { getServerSupabase } from "./supabase";
import { getRequestSupabase } from "./supabase-server";
import {
  normalizeRefereeLevel,
  questionLevelForRefereeLevel,
  type RefereeLevel,
} from "./learning";
import { clientIpFromRequest, enforceAuthenticatedApiRateLimit, enforceIpApiRateLimit, RateLimitError } from "./rate-limit";
import { parseUsername } from "./usernames";

export type RequestUser =
  | {
      ok: true;
      userId: string;
      email: string | null;
      username: string | null;
      refereeLevel: RefereeLevel;
    }
  | { ok: false; status: number; error: string };

export async function requireUserFromRequest(request: Request): Promise<RequestUser> {
  const supabase = getServerSupabase();
  try {
    await enforceIpApiRateLimit(supabase, clientIpFromRequest(request));
  } catch (rateLimitError) {
    if (rateLimitError instanceof RateLimitError) {
      return { ok: false, status: rateLimitError.status, error: rateLimitError.message };
    }
    return { ok: false, status: 503, error: "Request protection is temporarily unavailable" };
  }
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const authClient = token ? supabase : await getRequestSupabase();
  const { data, error } = token
    ? await authClient.auth.getUser(token)
    : await authClient.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  try {
    await enforceAuthenticatedApiRateLimit(supabase, data.user.id);
  } catch (rateLimitError) {
    if (rateLimitError instanceof RateLimitError) {
      return { ok: false, status: rateLimitError.status, error: rateLimitError.message };
    }
    return { ok: false, status: 503, error: "Request protection is temporarily unavailable" };
  }

  const email = data.user.email ?? null;
  const metadataLevel = normalizeRefereeLevel(data.user.user_metadata?.referee_level);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("referee_level, email, username")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  // The signup level only seeds a new profile; afterwards admins own it.
  const refereeLevel = normalizeRefereeLevel(profile?.referee_level ?? metadataLevel);

  let username: string | null = profile?.username ?? null;
  if (profile && profile.email !== email) {
    const { error: writeError } = await supabase.from("profiles").update({ email }).eq("user_id", data.user.id);
    if (writeError) {
      return { ok: false, status: 500, error: writeError.message };
    }
  } else if (!profile) {
    // The signup username also only seeds a new profile. If someone else
    // claimed it before this account was confirmed, create the profile
    // without one; the learner can choose another from the dashboard.
    const createProfile = (name: string | null) => supabase.from("profiles").upsert(
      { user_id: data.user.id, email, referee_level: refereeLevel, username: name },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
    username = parseUsername(data.user.user_metadata?.username);
    let { error: writeError } = await createProfile(username);
    if (writeError?.code === "23505" && username) {
      username = null;
      ({ error: writeError } = await createProfile(null));
    }
    if (writeError) {
      return { ok: false, status: 500, error: writeError.message };
    }
  }

  return {
    ok: true,
    userId: data.user.id,
    email,
    username,
    refereeLevel,
  };
}

export function requestUserQuestionLevel(user: Extract<RequestUser, { ok: true }>) {
  return questionLevelForRefereeLevel(user.refereeLevel);
}
