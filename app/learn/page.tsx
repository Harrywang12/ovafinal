"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  BookOpen, Clock, ChevronRight, GraduationCap, Target, Zap,
  Layout, Users, Trophy, Activity, Timer, Shield, Scale, Radio, ClipboardList,
  Palmtree, CircleDot
} from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { getAllModules, type Module } from "../../lib/module-content";
import { fadeInUp, staggerContainer, staggerItem, chapterCard } from "../../lib/animations";

// Map module IDs to custom icons
const moduleIcons: Record<string, React.ReactNode> = {
  facilities: <Layout size={24} />,
  participants: <Users size={24} />,
  format: <Trophy size={24} />,
  actions: <Activity size={24} />,
  interruptions: <Timer size={24} />,
  libero: <Shield size={24} />,
  conduct: <Scale size={24} />,
  referees: <Radio size={24} />,
  scorekeeping: <ClipboardList size={24} />,
  "rallyball-4v4": <CircleDot size={24} />,
  "rallyball-6v6": <CircleDot size={24} />,
  "beach": <Palmtree size={24} />,
};

type CategoryFilter = "indoor" | "rallyball-4v4" | "rallyball-6v6" | "beach";

const categories: { key: CategoryFilter; label: string; color: string; description: string }[] = [
  { key: "indoor", label: "Indoor 6v6", color: "#3b82f6", description: "Official Volleyball Canada rules for standard 6v6 indoor play" },
  { key: "rallyball-4v4", label: "4v4 Rallyball", color: "#f97316", description: "OVA entry-level format with smaller courts and Tripleball" },
  { key: "rallyball-6v6", label: "6v6 Rallyball", color: "#8b5cf6", description: "OVA developmental format with full-size courts and Tripleball" },
  { key: "beach", label: "Beach", color: "#06b6d4", description: "FIVB Beach Volleyball rules for 2-player sand court play" },
];

const categoryStats: Record<CategoryFilter, { chapters: string; lessons: string; rules: string; extra: string; extraLabel: string }> = {
  indoor: { chapters: "9", lessons: "32", rules: "32", extra: "25+", extraLabel: "Hand Signals" },
  "rallyball-4v4": { chapters: "1", lessons: "4", rules: "4v4", extra: "OVA", extraLabel: "Standard" },
  "rallyball-6v6": { chapters: "1", lessons: "4", rules: "6v6", extra: "OVA", extraLabel: "Standard" },
  beach: { chapters: "1", lessons: "6", rules: "FIVB", extra: "2v2", extraLabel: "Format" },
};

export default function LearnPage() {
  const allModules = getAllModules();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("indoor");

  const filteredModules = useMemo(() => {
    return allModules.filter(m => m.category === activeCategory);
  }, [allModules, activeCategory]);

  const stats = categoryStats[activeCategory];
  const activeCat = categories.find(c => c.key === activeCategory)!;

  const features = [
    {
      icon: <BookOpen size={24} />,
      title: "Official Rulebook Content",
      description: activeCategory === "indoor" 
        ? "Based on Volleyball Canada 2025-2026 Official Rules"
        : activeCategory === "beach"
          ? "Based on FIVB Beach Volleyball Rules 2025-2028"
          : "Based on OVA Rallyball Regulations"
    },
    {
      icon: <Target size={24} />,
      title: "Interactive Diagrams",
      description: "Visual court diagrams and referee signal illustrations"
    },
    {
      icon: <Zap size={24} />,
      title: "AI-Powered Quizzes",
      description: "Test your knowledge with dynamically generated questions"
    }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-28 pb-20 px-6">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
            <div className="absolute inset-0 court-pattern" />
          </div>
          
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent text-white mb-8 shadow-xl"
            >
              <GraduationCap size={40} />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-primary mb-6"
            >
              Master the
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
                Official Rulebook
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted max-w-2xl mx-auto mb-6 leading-relaxed"
            >
              Complete coverage of indoor, rallyball, and beach volleyball rules. 
              Learn every rule from court setup to referee signals.
            </motion.p>

            {/* Official badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-sm font-medium mb-10"
            >
              <BookOpen size={16} />
              {activeCategory === "beach" 
                ? "Based on FIVB Beach Volleyball Rules 2025-2028"
                : activeCategory === "indoor"
                  ? "Based on FIVB International Rules • Volleyball Canada Edition"
                  : "Based on OVA Rallyball Regulations"}
            </motion.div>
            
            {/* Feature pills */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap justify-center gap-4"
            >
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={staggerItem}
                  className="flex items-center gap-3 px-5 py-3 rounded-full bg-white border border-border shadow-sm"
                >
                  <span className="text-primary">{feature.icon}</span>
                  <span className="text-sm font-medium text-ink">{feature.title}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Category Toggle */}
        <section className="px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-2 mb-4"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <motion.button
                    key={cat.key}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "text-white shadow-lg"
                        : "text-ink bg-white border border-border hover:border-gray-300"
                    }`}
                    style={isActive ? { backgroundColor: cat.color } : undefined}
                  >
                    {cat.label}
                    {isActive && (
                      <motion.div
                        layoutId="category-indicator"
                        className="absolute inset-0 rounded-full -z-10"
                        style={{ backgroundColor: cat.color }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
            <motion.p
              key={activeCategory}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm text-muted"
            >
              {activeCat.description}
            </motion.p>
          </div>
        </section>
        
        {/* Modules Grid */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              key={activeCategory + "-header"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mb-12"
            >
              <p className="section-tag mb-3">
                {activeCategory === "indoor" ? "Complete Curriculum" : activeCat.label + " Curriculum"}
              </p>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary">
                {stats.chapters} {parseInt(stats.chapters) === 1 ? "Module" : "Chapters"} • {stats.lessons} Lessons • {stats.rules} {activeCategory === "indoor" ? "Official Rules" : "Ruleset"}
              </h2>
            </motion.div>
            
            <motion.div
              key={activeCategory + "-grid"}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={`grid gap-5 ${
                filteredModules.length <= 2 
                  ? "md:grid-cols-1 lg:grid-cols-1 max-w-2xl mx-auto" 
                  : "md:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {filteredModules.map((module: Module, idx: number) => (
                <motion.div
                  key={module.id}
                  variants={chapterCard}
                  custom={idx}
                >
                  <Link href={`/learn/${module.id}`}>
                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative h-full card overflow-hidden cursor-pointer"
                    >
                      {/* Background image overlay */}
                      <div 
                        className="absolute inset-0 opacity-5 group-hover:opacity-15 transition-opacity bg-cover bg-center"
                        style={{ backgroundImage: `url(${module.heroImage})` }}
                      />
                      
                      {/* Gradient overlay */}
                      <div 
                        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-25"
                        style={{ backgroundColor: module.color }}
                      />
                      
                      {/* Content */}
                      <div className="relative z-10">
                        {/* Chapter badge and Icon */}
                        <div className="flex items-start justify-between mb-4">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                            style={{ backgroundColor: module.color }}
                          >
                            {moduleIcons[module.id] || module.icon}
                          </motion.div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <span 
                              className="px-2.5 py-1 text-xs font-bold rounded-md text-white"
                              style={{ backgroundColor: module.color }}
                            >
                              {module.chapterLabel || `Ch. ${module.chapter}`}
                            </span>
                            <span className="text-[10px] font-mono text-muted">
                              {module.ruleRange}
                            </span>
                          </div>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-lg font-display font-bold text-primary mb-2 group-hover:text-primary transition-colors">
                          {module.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-muted text-sm leading-relaxed mb-4 line-clamp-2">
                          {module.description}
                        </p>
                        
                        {/* Meta */}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <BookOpen size={12} />
                              <span>{module.lessons.length}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <Clock size={12} />
                              <span>{module.estimatedTime}</span>
                            </div>
                          </div>
                          
                          <motion.div
                            className="flex items-center text-sm font-medium"
                            style={{ color: module.color }}
                          >
                            <ChevronRight 
                              size={16} 
                              className="transform group-hover:translate-x-1 transition-transform"
                            />
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Hover border effect */}
                      <div 
                        className="absolute inset-0 rounded-2xl border-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ borderColor: module.color }}
                      />
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        
        {/* Learning Path Section — only for indoor */}
        {activeCategory === "indoor" && (
          <section className="px-6 pb-24">
            <div className="max-w-5xl mx-auto">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/20 translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="flex-1">
                      <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2">
                        Recommended Path
                      </p>
                      <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
                        New to Officiating?
                      </h3>
                      <p className="text-white/80 leading-relaxed">
                        Start with Chapter 1: Facilities &amp; Equipment to understand the court setup.
                        Then progress through Playing Format and Actions before tackling Interruptions, 
                        Libero rules, and finally Referee Signals.
                      </p>
                    </div>
                    
                    <Link href="/learn/facilities">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-white text-primary font-semibold shadow-xl"
                      >
                        Start Chapter 1
                        <ChevronRight size={20} />
                      </motion.div>
                    </Link>
                  </div>
                  
                  {/* Progress path visualization */}
                  <div className="mt-10 flex items-center justify-between gap-1 overflow-x-auto pb-2">
                    {filteredModules.map((module: Module, idx: number) => (
                      <div key={module.id} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: module.color }}
                          >
                            {module.chapter}
                          </div>
                          <span className="text-[10px] text-white/60 whitespace-nowrap hidden md:block">
                            {module.title.split(" ")[0]}
                          </span>
                        </div>
                        {idx < filteredModules.length - 1 && (
                          <div className="w-4 md:w-6 h-0.5 bg-white/20 mx-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className="px-6 pb-24">
          <div className="max-w-4xl mx-auto">
            <motion.div
              key={activeCategory + "-stats"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { value: stats.chapters, label: parseInt(stats.chapters) === 1 ? "Module" : "Chapters" },
                { value: stats.lessons, label: "Lessons" },
                { value: stats.rules, label: activeCategory === "indoor" ? "Official Rules" : "Format" },
                { value: stats.extra, label: stats.extraLabel }
              ].map((stat, idx) => (
                <div key={idx} className="text-center p-6 rounded-2xl bg-white border border-border shadow-sm">
                  <div className="text-3xl font-display font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
