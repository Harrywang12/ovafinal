"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { getBrowserSupabase } from "../lib/supabase-browser";
import { useAdminAccess } from "../lib/useAdminAccess";
import { Logo } from "./logo";

const links = [{ href: "/learn", label: "Learn" }, { href: "/quiz", label: "Quizzes" }, { href: "/practice", label: "Video practice" }, { href: "/challenge", label: "Weekly challenge" }];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSupabaseAuth();
  const adminAccess = useAdminAccess(session);
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const mobileOpen = openPath === pathname;
  const navLinks = adminAccess.data?.isAdmin ? [...links, { href: "/admin", label: "Admin" }] : links;
  const handleLogout = async () => {
    setSigningOut(true);
    setLogoutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpenPath(null);
      router.replace("/");
      router.refresh();
    } catch {
      setLogoutError("Couldn’t sign out. Please try again.");
    } finally { setSigningOut(false); }
  };
  return (
    <header className="sport-nav">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="site-width sport-nav-inner"><Link href="/" aria-label="Volley Ref Lab home" onClick={() => setOpenPath(null)}><Logo size="sm" animate={false} /></Link>
        <nav className="desktop-nav" aria-label="Main navigation">{navLinks.map((link) => <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>{link.label}</Link>)}</nav>
        <div className="desktop-auth">{session ? <><Link className="sport-button sport-button-small" href="/dashboard">My training <ArrowUpRight size={16} /></Link><button onClick={handleLogout} disabled={signingOut} className="nav-signin">{signingOut ? "Signing out…" : "Sign out"}</button></> : <><Link href="/login" className="nav-signin">Sign in</Link><Link className="sport-button sport-button-small" href="/login?next=/dashboard">Get started <ArrowUpRight size={16} /></Link></>}</div>
        <button className="mobile-nav-toggle" type="button" onClick={() => setOpenPath(mobileOpen ? null : pathname)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
      {logoutError ? <p role="alert" className="nav-error">{logoutError}</p> : null}
      {mobileOpen ? <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation" onKeyDown={(event) => { if (event.key === "Escape") setOpenPath(null); }}>{navLinks.map((link) => <Link href={link.href} key={link.href} onClick={() => setOpenPath(null)} aria-current={pathname.startsWith(link.href) ? "page" : undefined}>{link.label}<ArrowUpRight size={20} /></Link>)}<Link href="/rulebook" onClick={() => setOpenPath(null)}>Rulebook <ArrowUpRight size={20} /></Link><div className="mobile-nav-auth"><Link href={session ? "/dashboard" : "/login?next=/dashboard"} className="sport-button" onClick={() => setOpenPath(null)}>{session ? "My training" : "Get started"}<ArrowUpRight size={18} /></Link>{session ? <button className="nav-signin" onClick={handleLogout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button> : <Link href="/login" onClick={() => setOpenPath(null)}>Sign in</Link>}</div></nav> : null}
    </header>
  );
}
