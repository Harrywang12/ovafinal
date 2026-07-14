"use client";

import { useAuthContext } from "../components/auth-provider";

export function useSupabaseAuth() {
  return useAuthContext();
}



