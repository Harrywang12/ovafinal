"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, Book } from "lucide-react";
import Link from "next/link";
import type { Module } from "../../lib/module-content";

interface ModuleHeroProps {
  module: Module;
  lessonCount: number;
}

export function ModuleHero({ module, lessonCount }: ModuleHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${module.heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[var(--surface)]" />
        
        {/* Decorative orbs */}
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
          style={{ backgroundColor: module.color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/4 w-60 h-60 rounded-full opacity-10"
          style={{ backgroundColor: module.color }}
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        />
      </div>
      
      {/* Content */}
      <div className="relative pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link 
              href="/learn"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Modules</span>
            </Link>
          </motion.div>
          
          {/* Module icon and title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row md:items-start gap-6"
          >
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl"
                style={{ backgroundColor: module.color }}
              >
                {module.icon}
              </motion.div>
              
              {/* Chapter badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35, type: "spring" }}
                className="flex flex-col items-center justify-center"
              >
                <div 
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: module.color }}
                >
                  Chapter {module.chapter}
                </div>
                <div className="mt-2 px-2 py-1 rounded bg-white/10 text-white/80 text-xs font-mono">
                  {module.ruleRange}
                </div>
              </motion.div>
            </div>
            
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl md:text-5xl font-display font-bold text-white mb-3"
              >
                {module.title}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/70 text-lg max-w-xl"
              >
                {module.description}
              </motion.p>
              
              {/* Meta info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-4 md:gap-6 mt-6"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80">
                  <BookOpen size={14} />
                  <span className="text-sm">{lessonCount} Lessons</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80">
                  <Clock size={14} />
                  <span className="text-sm">{module.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80">
                  <Book size={14} />
                  <span className="text-sm">{module.ruleRange}</span>
                </div>
              </motion.div>

              {/* Next module indicator */}
              {module.nextModule && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-4 text-xs text-white/50"
                >
                  Next: Chapter {module.chapter + 1}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent" />
    </div>
  );
}
