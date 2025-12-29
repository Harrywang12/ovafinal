"use client";

import { motion } from "framer-motion";
import { Lightbulb, Check } from "lucide-react";

interface KeyPointCardProps {
  points: string[];
  color: string;
}

export function KeyPointCard({ points, color }: KeyPointCardProps) {
  return (
    <div className="card bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Lightbulb size={16} style={{ color }} />
        </div>
        <h4 className="font-semibold text-primary">Key Points</h4>
      </div>
      
      <ul className="space-y-3">
        {points.map((point, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className="flex items-start gap-3"
          >
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${color}15` }}
            >
              <Check size={12} style={{ color }} />
            </div>
            <span className="text-sm text-ink leading-relaxed">{point}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

