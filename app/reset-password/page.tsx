"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Logo } from "../../components/logo";
import { getBrowserSupabase } from "../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setError(password.length < 8 ? "Use at least 8 characters." : "Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError("This reset link is invalid or expired. Request a new one.");
    else setComplete(true);
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Logo size="md" showText />
        <div className="card mt-8">
          <h1 className="text-3xl font-display font-bold text-primary">Choose a new password</h1>
          {complete ? (
            <div className="mt-6" role="status">
              <div className="flex items-center gap-2 text-green-700"><CheckCircle2 size={20} /><span className="font-semibold">Password updated</span></div>
              <Link href="/dashboard" className="pill mt-5 w-full justify-center text-white">Continue to dashboard</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {[{ id: "new-password", label: "New password", value: password, set: setPassword }, { id: "confirm-password", label: "Confirm password", value: confirm, set: setConfirm }].map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="block text-sm font-semibold text-primary mb-2">{field.label}</label>
                  <div className="relative"><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input id={field.id} type="password" autoComplete="new-password" minLength={8} required value={field.value} onChange={(event) => field.set(event.target.value)} className="w-full rounded-xl border border-border bg-white py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-accent/30" /></div>
                </div>
              ))}
              {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
              <button disabled={loading} className="pill w-full justify-center text-white disabled:opacity-60">{loading ? <><Loader2 size={17} className="animate-spin" /> Updating…</> : "Update password"}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
