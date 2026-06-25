"use client";

import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

export function useAdminAccess(session: Session | null) {
  return useQuery({
    queryKey: ["admin", "access", session?.user.id],
    enabled: !!session?.access_token,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/admin/access", {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      });

      if (!response.ok) {
        return { isAdmin: false, email: session?.user.email || null };
      }

      return response.json() as Promise<{ isAdmin: boolean; email: string }>;
    },
  });
}
