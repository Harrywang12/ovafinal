"use client";

import { motion } from "framer-motion";

interface CollectiveScreenProps {
  scenario?: "legal" | "screen-grouped" | "screen-moving";
  size?: "sm" | "md" | "lg";
}

export function CollectiveScreen({ 
  scenario = "legal",
  size = "md" 
}: CollectiveScreenProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const getPlayers = () => {
    switch (scenario) {
      case "legal":
        // Players spread out, serve path visible
        return [
          { x: 35, y: 55, label: "4" },
          { x: 75, y: 55, label: "3" },
          { x: 115, y: 55, label: "2" },
          { x: 35, y: 80, label: "5" },
          { x: 75, y: 80, label: "6" },
        ];
      case "screen-grouped":
        // Players grouped together blocking view
        return [
          { x: 70, y: 55, label: "4" },
          { x: 80, y: 55, label: "3" },
          { x: 90, y: 55, label: "2" },
          { x: 65, y: 70, label: "5" },
          { x: 85, y: 70, label: "6" },
        ];
      case "screen-moving":
        // Players with arms raised
        return [
          { x: 55, y: 55, label: "4", arms: true },
          { x: 75, y: 55, label: "3", arms: true },
          { x: 95, y: 55, label: "2", arms: true },
          { x: 45, y: 80, label: "5" },
          { x: 75, y: 80, label: "6" },
        ];
      default:
        return [];
    }
  };

  const players = getPlayers();
  const isFault = scenario !== "legal";

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 150 130" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="150" height="130" fill="#0f172a" />

        {/* Court surface */}
        <rect x="10" y="35" width="130" height="85" fill="#1e3a5f" opacity="0.5" />

        {/* Net */}
        <line x1="10" y1="35" x2="140" y2="35" stroke="#f97316" strokeWidth="2" />
        <text x="75" y="30" fill="white" fontSize="4" textAnchor="middle" opacity="0.7">NET</text>

        {/* Server position */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <circle cx="115" cy="115" r="8" fill="#3b82f6" stroke="white" strokeWidth="1" />
          <text x="115" y="118" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">1</text>
          <text x="115" y="128" fill="white" fontSize="3" textAnchor="middle" opacity="0.7">Server</text>
        </motion.g>

        {/* Ball trajectory */}
        <motion.path
          d={scenario === "legal" 
            ? "M 115,110 Q 75,30 40,50" 
            : "M 115,110 Q 80,50 75,55"}
          fill="none"
          stroke={isFault ? "#ef4444" : "#22c55e"}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />

        {/* Ball */}
        <motion.circle
          cx={scenario === "legal" ? 75 : 78}
          cy={scenario === "legal" ? 45 : 52}
          r="4"
          fill="#fbbf24"
          stroke="white"
          strokeWidth="0.8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
        />

        {/* Vision lines from receiving team */}
        {scenario === "legal" && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1 }}
          >
            <line x1="40" y1="20" x2="75" y2="45" stroke="#22c55e" strokeWidth="0.5" />
            <line x1="40" y1="20" x2="115" y2="110" stroke="#22c55e" strokeWidth="0.5" />
            <text x="30" y="18" fill="#22c55e" fontSize="3">Receiver can see serve</text>
          </motion.g>
        )}

        {/* Blocked vision indicator for screens */}
        {isFault && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <rect x="60" y="50" width="40" height="30" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeDasharray="2 2" />
            <text x="80" y="48" fill="#fca5a5" fontSize="4" textAnchor="middle">BLOCKED VIEW</text>
          </motion.g>
        )}

        {/* Serving team players */}
        {players.map((player, idx) => (
          <motion.g
            key={idx}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.1, type: "spring" }}
          >
            {/* Arms raised indicator */}
            {'arms' in player && player.arms && (
              <>
                <line 
                  x1={player.x - 5} 
                  y1={player.y - 8} 
                  x2={player.x - 8} 
                  y2={player.y - 18} 
                  stroke="#ef4444" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
                <line 
                  x1={player.x + 5} 
                  y1={player.y - 8} 
                  x2={player.x + 8} 
                  y2={player.y - 18} 
                  stroke="#ef4444" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </>
            )}
            
            <circle
              cx={player.x}
              cy={player.y}
              r="7"
              fill={isFault ? "#dc2626" : "#22c55e"}
              stroke="white"
              strokeWidth="1"
            />
            <text
              x={player.x}
              y={player.y + 2}
              textAnchor="middle"
              fill="white"
              fontSize="5"
              fontWeight="bold"
            >
              {player.label}
            </text>
          </motion.g>
        ))}

        {/* Status box */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <rect 
            x="10" 
            y="5" 
            width="130" 
            height="18" 
            rx="3"
            fill={isFault ? "#991b1b" : "#166534"}
          />
          <text 
            x="75" 
            y="12" 
            textAnchor="middle" 
            fill="white" 
            fontSize="4" 
            fontWeight="bold"
          >
            {scenario === "legal" && "✓ LEGAL: Server and ball flight visible"}
            {scenario === "screen-grouped" && "✕ SCREEN FAULT: Players grouped to hide serve"}
            {scenario === "screen-moving" && "✕ SCREEN FAULT: Arms raised to obstruct view"}
          </text>
        </motion.g>

        {/* Rule reference */}
        <text x="75" y="128" fill="white" fontSize="3" textAnchor="middle" opacity="0.5">
          Rule 12.5: Players must not prevent opponents from seeing the service hit or ball flight
        </text>
      </svg>
    </div>
  );
}

