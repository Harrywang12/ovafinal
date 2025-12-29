"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { getBrowserSupabase } from "../lib/supabase-browser";
import { Logo } from "./logo";

const links = [
  { href: "/learn", label: "Learn" },
  { href: "/quiz", label: "Quiz" },
  { href: "/practice", label: "Practice" },
  { href: "/challenge", label: "Challenge" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSupabaseAuth();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Track scroll position for navbar style changes
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const isHome = pathname === "/";

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-border"
            : isHome
              ? "bg-transparent"
              : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href="/" className="group">
            <Logo size="sm" showText={true} animate={true} />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary"
                        : scrolled || !isHome
                          ? "text-ink/70 hover:text-ink"
                          : "text-ink/70 hover:text-ink"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-primary/10 rounded-full"
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </motion.span>
                </Link>
              );
            })}
          </nav>
          
          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href="/quiz">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="pill text-white text-sm py-2"
                  >
                    Dashboard
                  </motion.span>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                    scrolled || !isHome
                      ? "text-muted hover:text-ink hover:bg-ink/5"
                      : "text-muted hover:text-ink hover:bg-white/20"
                  }`}
                >
                  Sign out
                </motion.button>
              </>
            ) : (
              <Link href="/login">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="pill text-white text-sm py-2"
                >
                  Get Started
                </motion.span>
              </Link>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-ink/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-ink" />
            ) : (
              <Menu size={24} className="text-ink" />
            )}
          </motion.button>
        </div>
      </motion.header>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {links.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-lg font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-ink hover:bg-ink/5"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: links.length * 0.1 }}
                className="mt-6 pt-6 border-t border-border"
              >
                {session ? (
                  <div className="space-y-3">
                    <Link
                      href="/quiz"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block"
                    >
                      <span className="pill text-white w-full justify-center">
                        Dashboard
                      </span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 rounded-xl text-muted hover:bg-ink/5 text-center"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <span className="pill text-white w-full justify-center">
                      Get Started
                    </span>
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
