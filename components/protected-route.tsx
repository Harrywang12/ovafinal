import { redirect } from "next/navigation";
import { getRequestSupabase } from "../lib/supabase-server";

export async function protectRoute() {
  const { data: { user } } = await (await getRequestSupabase()).auth.getUser();
  if (!user) redirect("/login");
}
