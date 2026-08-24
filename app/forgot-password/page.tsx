"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Logo } from "../../components/logo";
import { getBrowserSupabase } from "../../lib/supabase-browser";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
    const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);

    if (requestError) {
      setError("We couldn’t send a reset link right now. Please try again.");
      return;
    }

    setSent(true);
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
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-primary" htmlFor="recovery-email">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-border bg-white py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
              <button disabled={loading} className="pill w-full justify-center text-white disabled:opacity-60">
                {loading ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : "Send reset link"}
              </button>
            </form>
          )}
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent"><ArrowLeft size={16} /> Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
