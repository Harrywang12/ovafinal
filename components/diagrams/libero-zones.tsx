"use client";

import { motion } from "framer-motion";

interface LiberoZonesProps {
  showSettingRestriction?: boolean;
  showReplacementZone?: boolean;
}

export function LiberoZones({ 
  showSettingRestriction = true, 
  showReplacementZone = true 
}: LiberoZonesProps) {
  return (
    <div className="relative rounded-xl overflow-hidden h-48">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Court background */}
        <rect x="0" y="0" width="100" height="70" fill="#1e3a5f" />
        
        {/* Court outline */}
        <rect
          x="10"
          y="5"
          width="80"
          height="55"
          fill="rgba(255,255,255,0.05)"
          stroke="white"
          strokeWidth="0.8"
        />
        
        {/* Front zone (attack zone) - restricted for libero setting */}
        {showSettingRestriction && (
          <motion.rect
            x="10"
            y="5"
            width="80"
            height="20"
            fill="rgba(200, 16, 46, 0.2)"
            stroke="#c8102e"
            strokeWidth="0.5"
            strokeDasharray="3 2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          />
        )}
        
        {/* Attack line */}
        <line
          x1="10"
          y1="25"
          x2="90"
          y2="25"
          stroke="white"
          strokeWidth="1"
        />
        
        {/* Back zone - libero can play here freely */}
        <motion.rect
          x="10"
          y="25"
          width="80"
          height="35"
          fill="rgba(34, 197, 94, 0.1)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        />
        
        {/* Libero replacement zone */}
        {showReplacementZone && (
          <motion.g
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <rect
              x="0"
              y="25"
              width="10"
              height="35"
              fill="rgba(234, 179, 8, 0.3)"
              stroke="#eab308"
              strokeWidth="0.5"
            />
            <text
              x="5"
              y="43"
              textAnchor="middle"
              fill="#eab308"
              fontSize="3"
              fontWeight="bold"
              transform="rotate(-90, 5, 43)"
            >
              REPLACEMENT ZONE
            </text>
          </motion.g>
        )}
        
        {/* Libero player */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <circle cx="50" cy="45" r="6" fill="#eab308" stroke="white" strokeWidth="1" />
          <text x="50" y="47" textAnchor="middle" fill="#1e3a5f" fontSize="4" fontWeight="bold">
            L
          </text>
        </motion.g>
        
        {/* Labels */}
        <text x="50" y="15" textAnchor="middle" fill="#c8102e" fontSize="3" fontWeight="bold">
          FRONT ZONE
        </text>
        <text x="50" y="19" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2">
          Overhand set restricts attack
        </text>
        
        <text x="50" y="55" textAnchor="middle" fill="#22c55e" fontSize="3" fontWeight="bold">
          BACK ZONE
        </text>
        <text x="50" y="59" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2">
          No restrictions
        </text>
        
        {/* Net */}
        <rect x="10" y="3" width="80" height="2" fill="#ff6b35" opacity="0.8" />
        <text x="50" y="2" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="2.5">
          NET
        </text>
        
        {/* Legend */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <rect x="70" y="62" width="25" height="6" rx="1" fill="rgba(0,0,0,0.4)" />
          <circle cx="74" cy="65" r="2" fill="#eab308" />
          <text x="78" y="66" fill="white" fontSize="2.5">
            = Libero
          </text>
        </motion.g>
        
        {/* Restriction arrows */}
        {showSettingRestriction && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <path
              d="M 70 12 L 75 12"
              stroke="#c8102e"
              strokeWidth="1"
              markerEnd="url(#restrictArrow)"
            />
            <text x="77" y="13" fill="#c8102e" fontSize="2.5">
              No attack above net
            </text>
            <defs>
              <marker
                id="restrictArrow"
                markerWidth="4"
                markerHeight="4"
                refX="2"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill="#c8102e" />
              </marker>
            </defs>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

