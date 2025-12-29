"use client";

import { ReactNode, useEffect, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";

function AuthGuardInner({ children }: { children: ReactNode }) {
  const { session, loading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const nextUrl = useMemo(() => {
    const query = search.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, search]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      const params = new URLSearchParams({ next: nextUrl });
      router.replace(`/login?${params.toString()}`);
    }
  }, [loading, session, router, nextUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={32} className="text-primary" />
          </motion.div>
          <p className="text-muted text-sm">Checking your session...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

function AuthGuardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={32} className="text-accent" />
        </motion.div>
        <p className="text-muted text-sm">Loading...</p>
      </motion.div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthGuardFallback />}>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}

