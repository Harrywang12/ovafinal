"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase-browser";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

export function useSupabaseAuth(): AuthState {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setState({ session: data.session ?? null, loading: false });
      })
      .catch(() => {
        if (!isMounted) return;
        setState({ session: null, loading: false });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setState({ session, loading: false });
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}



