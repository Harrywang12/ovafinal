import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

/**
 * Server-side Supabase client using the service role key.
 * Use this for API routes where we need admin access to bypass RLS.
 */
export const getServerSupabase = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables missing (SUPABASE_URL, SUPABASE_SERVICE_KEY).");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        "x-client-info": "volleyball-ref-training"
      }
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
};
