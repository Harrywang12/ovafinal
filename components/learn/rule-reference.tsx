"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, ChevronDown, ChevronRight, AlertCircle, Bookmark } from "lucide-react";

interface RuleReferenceProps {
  ruleNumber: string;
  title?: string;
  content?: string;
  vcNote?: string;
  relatedRules?: string[];
  isKeyRule?: boolean;
}

export function RuleReference({
  ruleNumber,
  title,
  content,
  vcNote,
  relatedRules,
  isKeyRule = false
}: RuleReferenceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className={`rounded-lg border ${
        isKeyRule 
          ? "border-amber-500/50 bg-amber-500/10" 
          : "border-slate-700 bg-slate-800/50"
      } overflow-hidden`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${
            isKeyRule ? "bg-amber-500/20" : "bg-blue-500/20"
          }`}>
            {isKeyRule ? (
              <Bookmark className={`w-4 h-4 ${isKeyRule ? "text-amber-400" : "text-blue-400"}`} />
            ) : (
              <Book className="w-4 h-4 text-blue-400" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono font-semibold ${
              isKeyRule ? "text-amber-400" : "text-blue-400"
            }`}>
              Rule {ruleNumber}
            </span>
            {isKeyRule && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/30 text-amber-300 rounded">
                KEY RULE
              </span>
            )}
            {title && (
              <span className="text-slate-300 text-sm">
                — {title}
              </span>
            )}
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-700/50">
              {/* Rule content */}
              {content && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {content}
                </p>
              )}

              {/* Volleyball Canada note */}
              {vcNote && (
                <div className="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                      Volleyball Canada
                    </span>
                    <p className="text-sm text-emerald-200 mt-1">
                      {vcNote}
                    </p>
                  </div>
                </div>
              )}

              {/* Related rules */}
              {relatedRules && relatedRules.length > 0 && (
                <div className="pt-2 border-t border-slate-700/50">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">
                    Related Rules
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {relatedRules.map((rule) => (
                      <span
                        key={rule}
                        className="px-2 py-1 text-xs font-mono bg-slate-700/50 text-slate-400 rounded hover:bg-slate-700 cursor-pointer transition-colors"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Inline rule badge for use within text
export function RuleBadge({ 
  rule, 
  size = "sm" 
}: { 
  rule: string; 
  size?: "xs" | "sm" | "md";
}) {
  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1"
  };

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-medium bg-blue-500/20 text-blue-400 rounded ${sizeClasses[size]}`}>
      <Book className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {rule}
    </span>
  );
}

// Rule range display for module headers
export function RuleRangeDisplay({ 
  range, 
  chapter 
}: { 
  range: string; 
  chapter: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
        <span className="text-lg font-bold text-blue-400">
          {chapter}
        </span>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          Chapter {chapter}
        </span>
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <Book className="w-3.5 h-3.5 text-blue-400" />
          {range}
        </div>
      </div>
    </div>
  );
}

