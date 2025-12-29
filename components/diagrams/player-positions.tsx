"use client";

import { motion } from "framer-motion";

interface PlayerPositionsProps {
  showOverlapExample?: "correct" | "fault-front-back" | "fault-side" | null;
  highlightPosition?: number | null;
  size?: "sm" | "md" | "lg";
}

export function PlayerPositions({ 
  showOverlapExample = null, 
  highlightPosition = null,
  size = "md" 
}: PlayerPositionsProps) {
  const sizeClasses = {
    sm: "h-48",
    md: "h-64",
    lg: "h-80"
  };

  // Player positions for different scenarios
  const getPlayerPositions = () => {
    if (showOverlapExample === "fault-front-back") {
      // Back row player (1) is in front of front row player (2)
      return [
        { id: 4, x: 25, y: 25, label: "4", row: "front" },
        { id: 3, x: 50, y: 25, label: "3", row: "front" },
        { id: 2, x: 75, y: 30, label: "2", row: "front" }, // Moved back
        { id: 5, x: 25, y: 55, label: "5", row: "back" },
        { id: 6, x: 50, y: 55, label: "6", row: "back" },
        { id: 1, x: 75, y: 25, label: "1", row: "back", fault: true }, // In front of 2!
      ];
    }
    if (showOverlapExample === "fault-side") {
      // Right player (2) is left of center player (3)
      return [
        { id: 4, x: 25, y: 25, label: "4", row: "front" },
        { id: 3, x: 60, y: 25, label: "3", row: "front" }, // Moved right
        { id: 2, x: 45, y: 25, label: "2", row: "front", fault: true }, // Left of 3!
        { id: 5, x: 25, y: 55, label: "5", row: "back" },
        { id: 6, x: 50, y: 55, label: "6", row: "back" },
        { id: 1, x: 75, y: 55, label: "1", row: "back" },
      ];
    }
    // Correct positions
    return [
      { id: 4, x: 25, y: 25, label: "4", row: "front" },
      { id: 3, x: 50, y: 25, label: "3", row: "front" },
      { id: 2, x: 75, y: 25, label: "2", row: "front" },
      { id: 5, x: 25, y: 55, label: "5", row: "back" },
      { id: 6, x: 50, y: 55, label: "6", row: "back" },
      { id: 1, x: 75, y: 55, label: "1", row: "back" },
    ];
  };

  const players = getPlayerPositions();

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 100 90" className="w-full h-full">
        {/* Court background */}
        <rect x="5" y="5" width="90" height="80" fill="#1e3a5f" rx="2" />
        
        {/* Court outline */}
        <rect
          x="10"
          y="10"
          width="80"
          height="70"
          fill="none"
          stroke="white"
          strokeWidth="0.8"
        />
        
        {/* Attack line */}
        <line
          x1="10"
          y1="40"
          x2="90"
          y2="40"
          stroke="#ef4444"
          strokeWidth="0.6"
          strokeDasharray="2 1"
        />
        
        {/* Centre line (net) */}
        <line x1="10" y1="10" x2="90" y2="10" stroke="#f97316" strokeWidth="1.5" />
        <text x="50" y="8" fill="white" fontSize="4" textAnchor="middle" opacity="0.7">NET</text>

        {/* Player circles */}
        {players.map((player) => {
          const isHighlighted = highlightPosition === player.id;
          const isFault = 'fault' in player && player.fault;
          
          return (
            <motion.g key={player.id}>
              {/* Player circle */}
              <motion.circle
                cx={player.x}
                cy={player.y}
                r="6"
                fill={
                  isFault 
                    ? "#dc2626" 
                    : isHighlighted 
                      ? "#3b82f6" 
                      : player.row === "front" 
                        ? "#22c55e" 
                        : "#8b5cf6"
                }
                stroke={isFault ? "#fca5a5" : "white"}
                strokeWidth="1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: player.id * 0.1, type: "spring" }}
              />
              
              {/* Player number */}
              <motion.text
                x={player.x}
                y={player.y + 2}
                textAnchor="middle"
                fill="white"
                fontSize="6"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: player.id * 0.1 + 0.2 }}
              >
                {player.label}
              </motion.text>

              {/* Fault indicator */}
              {isFault && (
                <motion.g
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <text
                    x={player.x + 8}
                    y={player.y - 5}
                    fill="#fca5a5"
                    fontSize="5"
                    fontWeight="bold"
                  >
                    ✕
                  </text>
                </motion.g>
              )}
            </motion.g>
          );
        })}

        {/* Overlap comparison arrows for fault examples */}
        {showOverlapExample === "fault-front-back" && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <line x1="75" y1="28" x2="75" y2="52" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="2 1" />
            <text x="82" y="40" fill="#fca5a5" fontSize="4">1 in front of 2!</text>
          </motion.g>
        )}

        {showOverlapExample === "fault-side" && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <line x1="48" y1="25" x2="57" y2="25" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="2 1" />
            <text x="52" y="35" fill="#fca5a5" fontSize="4" textAnchor="middle">2 left of 3!</text>
          </motion.g>
        )}

        {/* Status indicator */}
        {showOverlapExample && (
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <rect 
              x="15" 
              y="75" 
              width="70" 
              height="10" 
              rx="2"
              fill={showOverlapExample === "correct" ? "#166534" : "#991b1b"}
            />
            <text 
              x="50" 
              y="81" 
              textAnchor="middle" 
              fill="white" 
              fontSize="5" 
              fontWeight="bold"
            >
              {showOverlapExample === "correct" ? "✓ CORRECT POSITIONS" : "✕ POSITIONAL FAULT"}
            </text>
          </motion.g>
        )}

        {/* Legend */}
        <g transform="translate(10, 82)">
          <circle cx="5" cy="3" r="2.5" fill="#22c55e" />
          <text x="10" y="5" fill="white" fontSize="4" opacity="0.7">Front Row</text>
          <circle cx="40" cy="3" r="2.5" fill="#8b5cf6" />
          <text x="45" y="5" fill="white" fontSize="4" opacity="0.7">Back Row</text>
        </g>

        {/* Row labels */}
        <text x="5" y="25" fill="white" fontSize="4" opacity="0.5">Front</text>
        <text x="5" y="55" fill="white" fontSize="4" opacity="0.5">Back</text>

        {/* Side labels */}
        <text x="25" y="67" fill="white" fontSize="3" textAnchor="middle" opacity="0.4">LEFT</text>
        <text x="50" y="67" fill="white" fontSize="3" textAnchor="middle" opacity="0.4">CENTER</text>
        <text x="75" y="67" fill="white" fontSize="3" textAnchor="middle" opacity="0.4">RIGHT</text>
      </svg>
    </div>
  );
}

