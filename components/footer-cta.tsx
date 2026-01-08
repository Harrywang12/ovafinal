"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Twitter } from "lucide-react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { fadeInUp, staggerContainer, staggerItem } from "../lib/animations";
import { Logo } from "./logo";

const footerLinks = [
  {
    title: "Training",
    links: [
      { label: "Learn", href: "/learn" },
      { label: "Quiz", href: "/quiz" },
      { label: "Practice", href: "/practice" },
      { label: "Challenge", href: "/challenge" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Rulebook", href: "/rulebook" },
    ],
  },
];

export function FooterCta() {
  const { session } = useSupabaseAuth();
  const href = session ? "/quiz" : "/login?next=/quiz";
  const label = session ? "Continue Training" : "Start Training Free";

  return (
    <footer className="relative mt-auto">
      {/* Mini CTA Bar */}
      <div className="bg-primary">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="text-center md:text-left">
              <p className="text-white/60 text-sm uppercase tracking-wider mb-1">
                Ready to level up?
              </p>
              <p className="text-white font-display font-bold text-xl md:text-2xl">
                Start training like a pro referee today
              </p>
            </div>
            <Link href={href}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                {label}
                <ArrowRight size={18} />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>
      
      {/* Main Footer */}
      <div className="bg-secondary">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {/* Brand */}
            <motion.div variants={staggerItem} className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Logo size="md" showText={true} />
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                AI-powered volleyball referee training. Master every call with confidence.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <Twitter size={18} />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <Github size={18} />
                </motion.a>
              </div>
            </motion.div>
            
            {/* Links */}
            {footerLinks.map((group) => (
              <motion.div key={group.title} variants={staggerItem}>
                <p className="text-white font-semibold mb-4">{group.title}</p>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-white/60 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Bottom Bar */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-sm"
          >
            <p>© {new Date().getFullYear()} Volley Ref Lab. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
