"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Sparkles, Loader2, CheckCircle2, UserPlus, LogIn } from "lucide-react";
import { getBrowserSupabase } from "../../lib/supabase-browser";
import { fadeInUp, staggerContainer, staggerItem } from "../../lib/animations";
import { Logo } from "../../components/logo";
import type { RefereeLevel } from "../../lib/learning";
import { safeRedirectPath } from "../../lib/safe-redirect";

const heroImage = "/images/editorial/referee-signal.jpg";

type AuthTab = "signin" | "signup";

function AuthForm() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const search = useSearchParams();
  const nextUrl = safeRedirectPath(search.get("next"));

  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [refereeLevel, setRefereeLevel] = useState<RefereeLevel>("level_1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(search.get("error") === "confirmation" ? "That confirmation link is invalid or expired." : null);

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    resetMessages();
    setPassword("");
    setConfirmPassword("");
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setError("We couldn’t sign you in with those credentials.");
      return;
    }
    router.replace(nextUrl);
    router.refresh();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        data: {
          referee_level: refereeLevel,
        },
      },
    });

    if (error) {
      setLoading(false);
      setError("We couldn’t create the account. Check your details or try signing in.");
      return;
    }

    // If email confirmation is disabled in Supabase, user is auto-confirmed
    // and we can redirect immediately
    if (data.session) {
      router.replace(nextUrl);
      router.refresh();
      return;
    }

    // If email confirmation is still enabled, show message
    setLoading(false);
    setMessage("Account created. Check your email to confirm your address, then return here to sign in.");
  };

  const tabContent = {
    signin: {
      title: "Sign in to continue",
      subtitle: "Access your training dashboard and track your progress.",
      buttonText: "Sign In",
      loadingText: "Signing in...",
    },
    signup: {
      title: "Create your account",
      subtitle: "Join thousands of referees mastering their craft.",
      buttonText: "Create Account",
      loadingText: "Creating account...",
    },
  };

  const currentContent = tabContent[activeTab];

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      {/* Mobile Logo */}
      <div className="lg:hidden mb-8">
        <Logo size="md" showText={true} />
      </div>

      {/* Tab Switcher */}
      <div className="flex mb-8 p-1 bg-white rounded-xl border border-border">
        <button
          type="button"
          onClick={() => handleTabChange("signin")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === "signin"
              ? "bg-primary text-white shadow-md"
              : "text-muted hover:text-primary"
          }`}
        >
          <LogIn size={16} />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("signup")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === "signup"
              ? "bg-primary text-white shadow-md"
              : "text-muted hover:text-primary"
          }`}
        >
          <UserPlus size={16} />
          Sign Up
        </button>
      </div>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
          <Sparkles size={14} />
          {activeTab === "signin" ? "Welcome Back" : "Get Started"}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-3xl font-display font-bold text-primary mb-2">
              {currentContent.title}
            </h2>
            <p className="text-muted">{currentContent.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <form
        className="space-y-5"
        onSubmit={activeTab === "signin" ? handlePasswordSignIn : handleSignUp}
      >
        <div>
          <label htmlFor="auth-email" className="block text-sm font-medium text-primary mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="email"
              id="auth-email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-sm font-medium text-primary mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="password"
              id="auth-password"
              name="password"
              autoComplete={activeTab === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={activeTab === "signup" ? 8 : undefined}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••••"
            />
          </div>
          {activeTab === "signup" && (
            <p className="mt-1 text-xs text-muted">Minimum 8 characters</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password"
                  id="auth-confirm-password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "signin" ? (
          <div className="-mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-accent">
              Forgot password?
            </Link>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {activeTab === "signup" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <label htmlFor="auth-referee-level" className="block text-sm font-medium text-primary">
                Referee Level
              </label>
              <select
                id="auth-referee-level"
                value={refereeLevel}
                onChange={(e) => setRefereeLevel(e.target.value as RefereeLevel)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="level_1">Level 1 - starts easy</option>
                <option value="level_2">Level 2 - starts intermediate</option>
                <option value="level_3">Level 3 - starts hard</option>
                <option value="level_4">Level 4 - starts hard</option>
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="pill text-white w-full justify-center disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {currentContent.loadingText}
            </>
          ) : (
            <>
              {currentContent.buttonText}
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </form>

      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2"
          role="status"
        >
          <CheckCircle2 size={18} className="flex-shrink-0" />
          {message}
        </motion.div>
      ) : null}

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </motion.div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        {activeTab === "signin" ? (
          <>
            After signing in you&apos;ll be redirected to{" "}
            <span className="font-medium text-primary">{nextUrl}</span>
          </>
        ) : (
          <>
            By signing up, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link>
          </>
        )}
      </p>
    </motion.div>
  );
}

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <div className="flex gap-2 mb-8">
        <div className="flex-1 h-12 bg-surface rounded-lg" />
        <div className="flex-1 h-12 bg-surface rounded-lg" />
      </div>
      <div className="h-8 w-32 bg-surface rounded-full mb-8" />
      <div className="h-10 w-64 bg-surface rounded-lg mb-2" />
      <div className="h-4 w-48 bg-surface rounded mb-8" />
      <div className="space-y-5">
        <div className="h-12 w-full bg-surface rounded-xl" />
        <div className="h-12 w-full bg-surface rounded-xl" />
        <div className="h-12 w-full bg-surface rounded-xl" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:w-1/2 relative"
      >
        <div className="absolute inset-0">
            <Image
              src={heroImage}
              alt="Volleyball action"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={staggerItem} className="mb-8">
              <Logo size="lg" showText={true} />
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl md:text-5xl font-display font-bold leading-tight mb-6"
            >
              Train like the pros.
              <br />
              <span className="text-white/80">Master every call.</span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl text-white/80 mb-8 max-w-md"
            >
              Join thousands of referees improving their game with AI-powered
              training and rulebook-grounded feedback.
            </motion.p>

            <motion.div variants={staggerItem} className="space-y-4">
              {[
                "Adaptive quizzes that scale with your skill",
                "Real game footage with timed decisions",
                "Every answer cites the official rulebook",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-surface">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
