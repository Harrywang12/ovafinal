"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Logo } from "../../components/logo";
import { getBrowserSupabase } from "../../lib/supabase-browser";

const RESET_COOLDOWN_MS = 60_000;
const RESET_COOLDOWN_STORAGE_KEY = "volley-ref-lab:password-reset-cooldown-until:v1";

function remainingCooldownSeconds(cooldownUntil: number, now: number) {
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
}

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function readStoredCooldown() {
  try {
    return Number(window.localStorage.getItem(RESET_COOLDOWN_STORAGE_KEY));
  } catch {
    return 0;
  }
}

function storeCooldown(cooldownUntil: number) {
  try {
    window.localStorage.setItem(RESET_COOLDOWN_STORAGE_KEY, String(cooldownUntil));
  } catch {
    // The in-memory timer still prevents duplicate sends for this page visit.
  }
}

function clearStoredCooldown() {
  try {
    window.localStorage.removeItem(RESET_COOLDOWN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const [cooldownReady, setCooldownReady] = useState(false);
  const cooldownSeconds = remainingCooldownSeconds(cooldownUntil, now);

  useEffect(() => {
    function syncCooldown() {
      const currentTime = Date.now();
      const storedValue = readStoredCooldown();
      const storedExpiry = Number.isFinite(storedValue) && storedValue > currentTime ? storedValue : 0;

      if (!storedExpiry) clearStoredCooldown();
      setNow(currentTime);
      setCooldownUntil(storedExpiry);
      setCooldownReady(true);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === RESET_COOLDOWN_STORAGE_KEY) syncCooldown();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") syncCooldown();
    }

    syncCooldown();
    window.addEventListener("focus", syncCooldown);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncCooldown);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime >= cooldownUntil) {
        clearStoredCooldown();
        setCooldownUntil(0);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cooldownReady || cooldownSeconds > 0) return;

    setLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (requestError) {
        setError("We couldn’t send a reset link right now. Please try again.");
        return;
      }

      const currentTime = Date.now();
      const nextCooldownUntil = currentTime + RESET_COOLDOWN_MS;
      storeCooldown(nextCooldownUntil);
      setNow(currentTime);
      setCooldownUntil(nextCooldownUntil);
      setSent(true);
    } catch {
      setError("We couldn’t send a reset link right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Logo size="md" showText />
        <div className="card mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Account recovery</p>
          <h1 className="mt-3 text-3xl font-display font-bold text-primary">Reset your password</h1>
          <p className="mt-2 text-sm text-muted">Enter your email and we’ll send a secure reset link if an account exists.</p>
          {sent ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
              Check your inbox for the next step. The message may take a few minutes.
            </div>
          ) : null}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-primary" htmlFor="recovery-email">Email address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-border bg-white py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
            <button disabled={loading || !cooldownReady || cooldownSeconds > 0} className="pill w-full justify-center text-white disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (
                <><Loader2 size={17} className="animate-spin" /> Sending…</>
              ) : !cooldownReady ? (
                "Checking…"
              ) : cooldownSeconds > 0 ? (
                <span aria-live="polite">Send another link in {formatCooldown(cooldownSeconds)}</span>
              ) : sent ? (
                "Send another reset link"
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent"><ArrowLeft size={16} /> Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
