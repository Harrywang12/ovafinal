"use client";

import { motion } from "framer-motion";
import type { Lesson } from "../../lib/module-content";

interface LessonTabsProps {
  lessons: Lesson[];
  activeTab: number;
  onTabChange: (index: number) => void;
  moduleColor: string;
}

export function LessonTabs({ lessons, activeTab, onTabChange, moduleColor }: LessonTabsProps) {
  return (
    <div className="relative">
      {/* Scrollable tab container */}
      <div className="overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {lessons.map((lesson, index) => {
            const isActive = activeTab === index;
            
            return (
              <motion.button
                key={lesson.id}
                onClick={() => onTabChange(index)}
                className={`relative px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "text-white shadow-lg"
                    : "text-muted bg-white border border-border hover:border-gray-300 hover:bg-gray-50"
                }`}
                style={isActive ? { backgroundColor: moduleColor } : {}}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? "bg-white/20" : "bg-gray-100"
                  }`}>
                    {index + 1}
                  </span>
                  {lesson.title}
                </span>
                
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: moduleColor }}
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* Progress indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: moduleColor }}
            initial={{ width: 0 }}
            animate={{ width: `${((activeTab + 1) / lessons.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs text-muted font-medium">
          {activeTab + 1} / {lessons.length}
        </span>
      </div>
    </div>
  );
}

