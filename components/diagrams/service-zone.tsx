"use client";

import { motion } from "framer-motion";

interface ServiceZoneProps {
  showServer?: boolean;
  showTimeline?: boolean;
}

export function ServiceZone({ showServer = true, showTimeline = true }: ServiceZoneProps) {
  return (
    <div className="relative rounded-xl overflow-hidden h-48">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Court background */}
        <rect x="0" y="0" width="100" height="70" fill="#1e3a5f" />
        
        {/* Court area */}
        <rect
          x="10"
          y="5"
          width="80"
          height="50"
          fill="rgba(255,255,255,0.05)"
          stroke="white"
          strokeWidth="0.8"
        />
        
        {/* End line */}
        <line
          x1="10"
          y1="55"
          x2="90"
          y2="55"
          stroke="white"
          strokeWidth="1.5"
        />
        
        {/* Service zone highlight */}
        <motion.rect
          x="10"
          y="55"
          width="80"
          height="15"
          fill="rgba(200, 16, 46, 0.3)"
          stroke="#c8102e"
          strokeWidth="1"
          strokeDasharray="3 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
        
        {/* Sideline extensions */}
        <line
          x1="10"
          y1="55"
          x2="10"
          y2="70"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.5"
          strokeDasharray="2 1"
        />
        <line
          x1="90"
          y1="55"
          x2="90"
          y2="70"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.5"
          strokeDasharray="2 1"
        />
        
        {/* Server position */}
        {showServer && (
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Server figure */}
            <circle cx="50" cy="62" r="4" fill="#c8102e" />
            <line x1="50" y1="66" x2="50" y2="72" stroke="#c8102e" strokeWidth="2" />
            
            {/* Ball toss arrow */}
            <motion.path
              d="M 52 60 Q 58 52 56 42"
              fill="none"
              stroke="#ff6b35"
              strokeWidth="1"
              strokeDasharray="2 1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            />
            <circle cx="56" cy="42" r="2" fill="#ff6b35" />
          </motion.g>
        )}
        
        {/* Labels */}
        <text x="50" y="66" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">
          SERVICE ZONE
        </text>
        <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="3">
          END LINE
        </text>
        
        {/* No rear limit indicator */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <path
            d="M 15 68 L 20 65 L 20 68"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.5"
          />
          <text x="26" y="68" fill="rgba(255,255,255,0.4)" fontSize="2.5">
            No rear limit
          </text>
        </motion.g>
        
        {/* 8 second indicator */}
        {showTimeline && (
          <motion.g
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <rect x="3" y="10" width="5" height="35" rx="1" fill="rgba(255,255,255,0.1)" />
            <motion.rect
              x="3"
              y="10"
              width="5"
              height="35"
              rx="1"
              fill="#c8102e"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1, duration: 1.5 }}
              style={{ transformOrigin: "bottom" }}
            />
            <text x="5.5" y="8" textAnchor="middle" fill="white" fontSize="3" fontWeight="bold">
              8s
            </text>
          </motion.g>
        )}
        
        {/* Net */}
        <rect x="10" y="4" width="80" height="1" fill="#ff6b35" opacity="0.8" />
        <text x="50" y="3" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3">
          NET
        </text>
      </svg>
    </div>
  );
}

