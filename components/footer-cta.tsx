"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { Logo } from "./logo";

export function FooterCta() {
  const { session } = useSupabaseAuth();
  return (
    <footer className="sport-footer"><div className="site-width">
      <div className="footer-callout"><div><h2>READY FOR THE WHISTLE?</h2></div><Link href={session ? "/dashboard" : "/login?next=/dashboard"} className="sport-button sport-button-white">{session ? "Back to your training" : "Start your training"}<ArrowUpRight size={20} /></Link></div>
      <div className="footer-main"><div className="footer-brand"><Logo size="md" animate={false} className="logo-on-dark" /><p>For the people who keep the game fair.<br />Volleyball referee development, one call at a time.</p></div><nav aria-label="Footer training"><p className="eyebrow">THE LAB</p><Link href="/learn">Learning modules</Link><Link href="/quiz">Referee quizzes</Link><Link href="/practice">Video practice</Link><Link href="/challenge">Weekly challenge</Link></nav><nav aria-label="Footer resources"><p className="eyebrow">OFF THE COURT</p><Link href="/dashboard">My training</Link><Link href="/rulebook">Official rulebook</Link><a href="https://www.ontariovolleyball.org/" target="_blank" rel="noopener noreferrer">Ontario Volleyball <ArrowUpRight size={13} /></a></nav></div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} Volley Ref Lab</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div>
    </div></footer>
  );
}
