"use client";

import { motion } from "framer-motion";

interface CompletedBlockProps {
  scenario?: "single" | "double" | "triple" | "back-row-fault";
  showHitCount?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CompletedBlock({ 
  scenario = "double",
  showHitCount = true,
  size = "md" 
}: CompletedBlockProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const getBlockers = () => {
    switch (scenario) {
      case "single":
        return [{ x: 75, y: 40, label: "3", row: "front" }];
      case "double":
        return [
          { x: 60, y: 40, label: "4", row: "front" },
          { x: 90, y: 40, label: "3", row: "front" }
        ];
      case "triple":
        return [
          { x: 45, y: 40, label: "4", row: "front" },
          { x: 75, y: 40, label: "3", row: "front" },
          { x: 105, y: 40, label: "2", row: "front" }
        ];
      case "back-row-fault":
        return [
          { x: 60, y: 40, label: "4", row: "front" },
          { x: 90, y: 40, label: "6", row: "back", fault: true }
        ];
      default:
        return [];
    }
  };

  const blockers = getBlockers();
  const isFault = scenario === "back-row-fault";

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 150 130" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="150" height="130" fill="#0f172a" />

        {/* Court surface */}
        <rect x="10" y="70" width="130" height="55" fill="#1e3a5f" opacity="0.5" />

        {/* Attack line */}
        <line x1="10" y1="90" x2="140" y2="90" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
        <text x="145" y="92" fill="#ef4444" fontSize="4" opacity="0.6">Attack Line</text>

        {/* Net */}
        <rect x="20" y="50" width="110" height="20" fill="none" stroke="#334155" strokeWidth="0.5" />
        <rect x="20" y="48" width="110" height="3" fill="white" />
        <line x1="10" y1="60" x2="140" y2="60" stroke="#f97316" strokeWidth="2" />

        {/* Net height indicator */}
        <text x="75" y="46" fill="white" fontSize="4" textAnchor="middle" opacity="0.5">NET (top)</text>

        {/* Attacker (opponent side - top) */}
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <circle cx="75" cy="25" r="8" fill="#f59e0b" stroke="white" strokeWidth="1" />
          <text x="75" y="28" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">A</text>
          <text x="75" y="12" fill="white" fontSize="4" textAnchor="middle" opacity="0.7">Attacker</text>
        </motion.g>

        {/* Ball trajectory */}
        <motion.path
          d="M 75,30 Q 75,45 75,52"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />

        {/* Ball at block contact */}
        <motion.circle
          cx="75"
          cy="52"
          r="5"
          fill="#fbbf24"
          stroke="white"
          strokeWidth="1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
        />

        {/* Blockers */}
        {blockers.map((blocker, idx) => {
          const isFaultPlayer = 'fault' in blocker && blocker.fault;
          return (
            <motion.g
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.15 }}
            >
              {/* Blocker hands above net */}
              <rect
                x={blocker.x - 8}
                y="42"
                width="16"
                height="18"
                fill={isFaultPlayer ? "#dc2626" : "#22c55e"}
                opacity="0.3"
                rx="2"
              />
              
              {/* Blocker body */}
              <circle
                cx={blocker.x}
                cy="75"
                r="8"
                fill={isFaultPlayer ? "#dc2626" : blocker.row === "front" ? "#22c55e" : "#8b5cf6"}
                stroke={isFaultPlayer ? "#fca5a5" : "white"}
                strokeWidth="1"
              />
              <text
                x={blocker.x}
                y="78"
                textAnchor="middle"
                fill="white"
                fontSize="6"
                fontWeight="bold"
              >
                {blocker.label}
              </text>

              {/* Fault indicator */}
              {isFaultPlayer && (
                <g>
                  <text x={blocker.x + 12} y="70" fill="#fca5a5" fontSize="8" fontWeight="bold">✕</text>
                  <text x={blocker.x} y="88" fill="#fca5a5" fontSize="4" textAnchor="middle">Back Row!</text>
                </g>
              )}
            </motion.g>
          );
        })}

        {/* Hit count explanation */}
        {showHitCount && !isFault && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <rect x="10" y="100" width="130" height="25" fill="#1e293b" rx="3" />
            <text x="75" y="110" textAnchor="middle" fill="#22c55e" fontSize="5" fontWeight="bold">
              Block Contact ≠ Team Hit
            </text>
            <text x="75" y="120" textAnchor="middle" fill="white" fontSize="4" opacity="0.8">
              Team still has 3 hits to return the ball after block
            </text>
          </motion.g>
        )}

        {/* Fault explanation */}
        {isFault && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <rect x="10" y="100" width="130" height="25" fill="#7f1d1d" rx="3" />
            <text x="75" y="110" textAnchor="middle" fill="#fca5a5" fontSize="5" fontWeight="bold">
              ✕ BLOCKING FAULT
            </text>
            <text x="75" y="120" textAnchor="middle" fill="white" fontSize="4" opacity="0.8">
              Back-row player (or Libero) cannot complete a block
            </text>
          </motion.g>
        )}

        {/* Block type label */}
        <motion.text
          x="75"
          y="8"
          textAnchor="middle"
          fill="white"
          fontSize="5"
          fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {scenario === "single" && "Single Block"}
          {scenario === "double" && "Double Block"}
          {scenario === "triple" && "Triple Block"}
          {scenario === "back-row-fault" && "Illegal Back-Row Block"}
        </motion.text>
      </svg>
    </div>
  );
}

