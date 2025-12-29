"use client";

import Link from "next/link";
import { ArrowRight, Play, ChevronDown, Zap, Target, Trophy, BookOpen } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSupabaseAuth } from "../lib/useSupabaseAuth";
import { Logo, LogoIcon } from "../components/logo";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  wordRevealContainer,
  wordReveal,
  scaleIn,
  fadeInLeft,
  fadeInRight,
  scrollReveal,
} from "../lib/animations";

// High-quality volleyball imagery from Unsplash
const images = {
  hero: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1920&q=90",
  action: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=85",
  court: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85",
  team: "https://images.unsplash.com/photo-1509475291189-9a5f06e73e10?auto=format&fit=crop&w=1200&q=85",
  spike: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1200&q=85",
  celebrate: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=85",
};

const steps = [
  {
    icon: BookOpen,
    title: "Learn the Rules",
    desc: "Interactive modules with micro-quizzes. Master rotations, faults, and edge cases.",
    href: "/learn",
    image: images.court,
  },
  {
    icon: Target,
    title: "Take Adaptive Quizzes",
    desc: "AI-generated questions that scale with your skill. Every answer cites the rulebook.",
    href: "/quiz",
    image: images.action,
  },
  {
    icon: Play,
    title: "Practice with Video",
    desc: "Real game footage with timed decisions. Train your instincts at match speed.",
    href: "/practice",
    image: images.spike,
  },
  {
    icon: Trophy,
    title: "Compete Weekly",
    desc: "Weekly challenge clips with leaderboard rankings. Prove your expertise.",
    href: "/challenge",
    image: images.celebrate,
  },
];

const stats = [
  { value: "100%", label: "Rulebook-cited answers" },
  { value: "Live", label: "Weekly challenges" },
  { value: "AI", label: "Adaptive difficulty" },
];

// Animated word component
function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <motion.span
      variants={wordRevealContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={wordReveal}
          className="inline-block mr-[0.25em]"
          style={{ perspective: "1000px" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Scroll indicator component
function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-primary/60"
    >
      <span className="text-xs font-medium uppercase tracking-widest">Scroll to explore</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown size={24} />
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const { session } = useSupabaseAuth();
  const primaryCtaHref = session ? "/quiz" : "/login?next=/quiz";
  const practiceHref = session ? "/practice" : "/login?next=/practice";
  
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  return (
    <div className="overflow-hidden">
      {/* ============================================
          HERO SECTION - Full Viewport
          ============================================ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax Background Image */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y: heroY, scale: heroScale }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-surface/30 via-surface/60 to-surface z-10" />
          <img
            src={images.hero}
            alt="Volleyball action"
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 max-w-6xl mx-auto px-6 text-center"
        >
          {/* Logo Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
            className="mb-6 flex justify-center"
          >
            <LogoIcon size={64} className="drop-shadow-lg" />
          </motion.div>
          
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              <Zap size={16} />
              AI-Powered Referee Training
            </span>
          </motion.div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-primary leading-[0.95] mb-6">
            <AnimatedWords text="Master the Whistle" />
          </h1>
          
          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10"
          >
            Train like the pros. Adaptive quizzes, real game footage, and rulebook-grounded 
            explanations—all in one powerful platform.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href={primaryCtaHref}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="pill text-white text-base"
              >
                {session ? "Continue Training" : "Start Training Free"}
                <ArrowRight size={18} />
              </motion.span>
            </Link>
            <Link href={practiceHref}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="btn-secondary"
              >
                <Play size={16} />
                Watch Demo
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
        
        <ScrollIndicator />
      </section>

      {/* ============================================
          FLOATING IMAGES SECTION
          ============================================ */}
      <section className="relative py-20 -mt-32 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-12 gap-4 md:gap-6"
          >
            {/* Large left image */}
            <motion.div
              variants={fadeInLeft}
              className="col-span-12 md:col-span-7 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img
                  src={images.action}
                  alt="Volleyball spike"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="section-tag text-white/80">Live Analysis</span>
                  <p className="text-2xl md:text-3xl font-display font-bold text-white mt-2">
                    Real-time decision training
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* Right column - two stacked images */}
            <div className="col-span-12 md:col-span-5 flex flex-col gap-4 md:gap-6">
              <motion.div
                variants={fadeInRight}
                className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/2]"
              >
                <img
                  src={images.court}
                  alt="Volleyball court"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="text-white font-semibold">Court Visuals</span>
                </div>
              </motion.div>
              
              <motion.div
                variants={fadeInRight}
                className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/2]"
              >
                <img
                  src={images.team}
                  alt="Volleyball team"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="text-white font-semibold">Game Scenarios</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          STATS SECTION
          ============================================ */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-3 gap-8 text-center"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={staggerItem}>
                <p className="text-4xl md:text-5xl font-display font-bold text-accent mb-2">
                  {stat.value}
                </p>
                <p className="text-white/70 text-sm md:text-base">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          STEPS SECTION - Your Path to Mastery
          ============================================ */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section Header */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <span className="section-tag">Your Journey</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-primary mt-4 mb-4">
              The Path to Mastery
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Four focused steps to transform you from rulebook reader to confident referee.
            </p>
          </motion.div>
          
          {/* Steps Grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="space-y-8"
          >
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isEven = idx % 2 === 0;
              const href = session
                ? step.href
                : `/login?next=${encodeURIComponent(step.href)}`;
              
              return (
                <motion.div
                  key={step.title}
                  variants={isEven ? fadeInLeft : fadeInRight}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    isEven ? "" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Image */}
                  <div className="w-full md:w-1/2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-2xl overflow-hidden shadow-xl aspect-video"
                    >
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white font-display font-bold text-xl">
                          {idx + 1}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Content */}
                  <div className="w-full md:w-1/2 space-y-4">
                    <div className="inline-flex items-center gap-3 text-accent">
                      <Icon size={24} />
                      <span className="section-tag">{`Step ${idx + 1}`}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-primary">
                      {step.title}
                    </h3>
                    <p className="text-muted text-lg">{step.desc}</p>
                    <Link href={href}>
                      <motion.span
                        whileHover={{ x: 5 }}
                        className="inline-flex items-center gap-2 text-accent font-semibold"
                      >
                        {session ? "Start now" : "Log in to access"}
                        <ArrowRight size={18} />
                      </motion.span>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          FEATURES SHOWCASE
          ============================================ */}
      <section className="py-24 bg-gradient-to-b from-surface to-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <span className="section-tag">Built Different</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-primary mt-4 mb-4">
              Why Volley Ref Lab?
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Not just another quiz app. A complete training system grounded in the official rulebook.
            </p>
          </motion.div>
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                title: "RAG-Powered Answers",
                desc: "Every explanation cites the actual rulebook. No guessing, no hallucinations.",
                icon: "📚",
              },
              {
                title: "Adaptive Difficulty",
                desc: "Questions scale with your performance. Always challenged, never overwhelmed.",
                icon: "📈",
              },
              {
                title: "Match-Speed Training",
                desc: "Timed video clips simulate real game pressure. Build instincts, not just knowledge.",
                icon: "⚡",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                className="card text-center p-8"
              >
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-xl font-display font-bold text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          FINAL CTA SECTION
          ============================================ */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={images.celebrate}
            alt="Volleyball celebration"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/85" />
        </div>
        
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white"
        >
          <span className="section-tag text-accent">Ready to Begin?</span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mt-4 mb-6">
            Your Next Call Starts Here
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join referees who train smarter. Track your progress, compete weekly, 
            and master every ruling with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={primaryCtaHref}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="pill text-white text-lg px-8 py-4"
              >
                {session ? "Go to Dashboard" : "Create Free Account"}
                <ArrowRight size={20} />
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
