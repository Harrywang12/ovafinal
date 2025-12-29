"use client";

import { motion } from "framer-motion";

interface BlockingPositionsProps {
  blockType?: "single" | "double" | "triple";
  showAttacker?: boolean;
}

export function BlockingPositions({ blockType = "double", showAttacker = true }: BlockingPositionsProps) {
  const blockerCount = blockType === "single" ? 1 : blockType === "double" ? 2 : 3;
  
  const blockerPositions = {
    single: [{ x: 50, y: 18 }],
    double: [{ x: 40, y: 18 }, { x: 60, y: 18 }],
    triple: [{ x: 30, y: 18 }, { x: 50, y: 18 }, { x: 70, y: 18 }]
  };

  return (
    <div className="relative rounded-xl overflow-hidden h-48">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Court background */}
        <rect x="0" y="0" width="100" height="70" fill="#1e3a5f" />
        
        {/* Court sections */}
        <rect
          x="10"
          y="5"
          width="80"
          height="30"
          fill="rgba(255,255,255,0.03)"
          stroke="white"
          strokeWidth="0.5"
        />
        <rect
          x="10"
          y="35"
          width="80"
          height="30"
          fill="rgba(200,16,46,0.05)"
          stroke="white"
          strokeWidth="0.5"
        />
        
        {/* Net */}
        <motion.rect
          x="10"
          y="33"
          width="80"
          height="4"
          fill="#ff6b35"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5 }}
        />
        <text x="50" y="36" textAnchor="middle" fill="white" fontSize="2.5" fontWeight="bold">
          NET
        </text>
        
        {/* Blockers */}
        {blockerPositions[blockType].map((pos, idx) => (
          <motion.g
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
          >
            {/* Blocker body */}
            <rect
              x={pos.x - 5}
              y={pos.y - 2}
              width="10"
              height="18"
              rx="2"
              fill="#c8102e"
              stroke="white"
              strokeWidth="0.5"
            />
            
            {/* Arms reaching up */}
            <motion.path
              d={`M ${pos.x - 4} ${pos.y} L ${pos.x - 6} ${pos.y - 8} M ${pos.x + 4} ${pos.y} L ${pos.x + 6} ${pos.y - 8}`}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
            />
            
            {/* Hands */}
            <circle cx={pos.x - 6} cy={pos.y - 9} r="2" fill="white" />
            <circle cx={pos.x + 6} cy={pos.y - 9} r="2" fill="white" />
          </motion.g>
        ))}
        
        {/* Attacker */}
        {showAttacker && (
          <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <rect
              x="45"
              y="45"
              width="10"
              height="16"
              rx="2"
              fill="rgba(255,255,255,0.3)"
              stroke="white"
              strokeWidth="0.5"
            />
            
            {/* Attack arm */}
            <motion.path
              d="M 52 47 Q 58 42 56 38"
              stroke="#ff6b35"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            />
            
            {/* Ball */}
            <motion.circle
              cx="56"
              cy="36"
              r="3"
              fill="#ff6b35"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
            />
            
            {/* Ball trajectory */}
            <motion.path
              d="M 56 36 Q 50 28 50 14"
              stroke="#ff6b35"
              strokeWidth="1"
              strokeDasharray="2 1"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            />
          </motion.g>
        )}
        
        {/* Labels */}
        <text x="50" y="68" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3">
          {blockType.toUpperCase()} BLOCK
        </text>
        
        <text x="15" y="20" fill="rgba(255,255,255,0.4)" fontSize="2.5">
          YOUR SIDE
        </text>
        <text x="15" y="50" fill="rgba(255,255,255,0.4)" fontSize="2.5">
          OPPONENT
        </text>
        
        {/* Block contact indicator */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <rect x="65" y="5" width="28" height="10" rx="1" fill="rgba(0,0,0,0.3)" />
          <text x="79" y="11" textAnchor="middle" fill="white" fontSize="2.5">
            Block = 0 hits
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

