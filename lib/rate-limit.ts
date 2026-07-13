import type { SupabaseClient } from "@supabase/supabase-js";

export async function enforceGenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  units = 1,
  options: { hourly?: number; daily?: number } = {}
) {
  const hourly = options.hourly ?? 20;
  const daily = options.daily ?? 80;
  const now = Date.now();
  const [hourResult, dayResult] = await Promise.all([
    supabase.from("quiz_generation_events").select("units").eq("user_id", userId).gte("created_at", new Date(now - 60 * 60 * 1000).toISOString()),
    supabase.from("quiz_generation_events").select("units").eq("user_id", userId).gte("created_at", new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (hourResult.error) throw hourResult.error;
  if (dayResult.error) throw dayResult.error;
  const hourUnits = (hourResult.data || []).reduce((sum, row) => sum + Number(row.units || 0), 0);
  const dayUnits = (dayResult.data || []).reduce((sum, row) => sum + Number(row.units || 0), 0);
  if (hourUnits + units > hourly || dayUnits + units > daily) {
    const error = new Error("AI question generation quota exceeded. Try again later.") as Error & { code?: string; status?: number };
    error.code = "GENERATION_QUOTA_EXCEEDED";
    error.status = 429;
    throw error;
  }
  const { error } = await supabase.from("quiz_generation_events").insert({ user_id: userId, units });
  if (error) throw error;
}
