"use client";

import { TrainingMasthead } from "../../components/training-masthead";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  BookOpen, Clock, ChevronRight, Target,
  Layout, Users, Trophy, Activity, Timer, Shield, Scale, Radio, ClipboardList,
  Palmtree, CircleDot
} from "lucide-react";
import { AuthGuard } from "../../components/auth-guard";
import { getAllModules, type Module } from "../../lib/module-content";
import { fadeInUp, staggerContainer, staggerItem, chapterCard } from "../../lib/animations";
import { useSupabaseAuth } from "../../lib/useSupabaseAuth";
import type { LearningProgressResponse, ModuleProgressSummary } from "../../lib/learning";

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
  { key: "indoor", label: "Indoor 6v6", color: "#c8102e", description: "Official Volleyball Canada rules for standard 6v6 indoor play" },
  { key: "rallyball-4v4", label: "4v4 Rallyball", color: "#9a3412", description: "OVA entry-level format with smaller courts and Tripleball" },
  { key: "rallyball-6v6", label: "6v6 Rallyball", color: "#655140", description: "OVA developmental format with full-size courts and Tripleball" },
  { key: "beach", label: "Beach", color: "#0e7490", description: "FIVB Beach Volleyball rules for 2-player sand court play" },
];

const categoryStats: Record<CategoryFilter, { chapters: string; lessons: string; rules: string; extra: string; extraLabel: string }> = {
  indoor: { chapters: "9", lessons: "32", rules: "32", extra: "25+", extraLabel: "Hand Signals" },
  "rallyball-4v4": { chapters: "1", lessons: "4", rules: "4v4", extra: "OVA", extraLabel: "Standard" },
  "rallyball-6v6": { chapters: "1", lessons: "4", rules: "6v6", extra: "OVA", extraLabel: "Standard" },
  beach: { chapters: "1", lessons: "6", rules: "FIVB", extra: "2v2", extraLabel: "Format" },
};

export default function LearnPage() {
  const { session } = useSupabaseAuth();
  const allModules = getAllModules();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("indoor");

  const progressQuery = useQuery<LearningProgressResponse>({
    queryKey: ["learn-progress"],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch("/api/learn/progress", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load learning progress");
      return res.json();
    },
  });

  const progressByModule = useMemo(() => {
    return new Map((progressQuery.data?.modules || []).map((m) => [m.module_id, m]));
  }, [progressQuery.data?.modules]);

  const filteredModules = useMemo(() => {
    return allModules
      .filter(m => m.category === activeCategory)
      .sort((a, b) => {
        const aAssigned = progressByModule.get(a.id)?.assigned ? 1 : 0;
        const bAssigned = progressByModule.get(b.id)?.assigned ? 1 : 0;
        return bAssigned - aAssigned;
      });
  }, [allModules, activeCategory, progressByModule]);

  const stats = categoryStats[activeCategory];
  const activeCat = categories.find(c => c.key === activeCategory)!;

  const statusBadge = (progress?: ModuleProgressSummary) => {
    if (progress?.passed) return { label: "Passed", cls: "bg-green-100 text-green-700 border-green-200" };
    if (progress?.assigned) return { label: "Required", cls: "bg-primary/10 text-primary border-primary/20" };
    if (progress && (progress.lessons_viewed > 0 || progress.attempts > 0)) {
      return { label: "In Progress", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    return { label: "Not Started", cls: "bg-white text-muted border-border" };
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <section className="pt-24 px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            <TrainingMasthead number="01" eyebrow="KNOW THE RULES" title="Learn the game." description="From court setup to the final whistle. Explore the rules of indoor, beach, and rallyball volleyball with lessons and interactive diagrams." image="/images/editorial/volleyball-court.jpg" />
            <p className="text-sm text-muted mb-4">{activeCategory === "beach" ? "Based on FIVB Beach Volleyball Rules 2025–2028" : activeCategory === "indoor" ? "Based on official Volleyball Canada rules" : "Based on OVA Rallyball Regulations"}</p>
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
                        className="absolute inset-0 rounded-sm -z-10"
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
                  {(() => {
                    const progress = progressByModule.get(module.id);
                    const badge = statusBadge(progress);
                    return (
                  <Link href={`/learn/${module.id}`}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative h-full card overflow-hidden cursor-pointer"
                    >
                      {/* Content */}
                      <div className="relative z-10">
                        {/* Chapter badge and Icon */}
                        <div className="flex items-start justify-between mb-4">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                            style={{ backgroundColor: "#20231f" }}
                          >
                            {moduleIcons[module.id] || module.icon}
                          </motion.div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <span 
                              className="px-2.5 py-1 text-xs font-bold rounded-md text-white"
                              style={{ backgroundColor: "#20231f" }}
                            >
                              {module.chapterLabel || `Ch. ${module.chapter}`}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.cls}`}>
                              {badge.label}
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
                            {progress && (
                              <div className="hidden sm:flex items-center gap-1 text-xs text-muted">
                                <Target size={12} />
                                <span>{progress.latest_score_percent}%</span>
                              </div>
                            )}
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
                    );
                  })()}
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
                            style={{ backgroundColor: "#20231f" }}
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
