"use client";

import { motion } from "framer-motion";

interface BackRowAttackProps {
  scenario?: "legal-behind-line" | "legal-below-net" | "fault-front-zone";
  size?: "sm" | "md" | "lg";
}

export function BackRowAttack({ 
  scenario = "legal-behind-line",
  size = "md" 
}: BackRowAttackProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const scenarios = {
    "legal-behind-line": {
      takeoffX: 75,
      takeoffY: 100,
      ballY: 35,
      isLegal: true,
      label: "Legal: Take-off behind attack line, ball above net"
    },
    "legal-below-net": {
      takeoffX: 75,
      takeoffY: 60,
      ballY: 55,
      isLegal: true,
      label: "Legal: In front zone, but ball below net height"
    },
    "fault-front-zone": {
      takeoffX: 75,
      takeoffY: 60,
      ballY: 35,
      isLegal: false,
      label: "Fault: Take-off in front zone, ball above net"
    }
  };

  const current = scenarios[scenario];

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 150 140" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="150" height="140" fill="#0f172a" />

        {/* Court surface */}
        <rect x="10" y="40" width="130" height="90" fill="#1e3a5f" opacity="0.5" />

        {/* Front zone highlight */}
        <rect 
          x="10" 
          y="40" 
          width="130" 
          height="35" 
          fill={scenario === "fault-front-zone" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.1)"} 
        />
        <text x="75" y="58" fill="white" fontSize="4" textAnchor="middle" opacity="0.6">FRONT ZONE</text>

        {/* Back zone */}
        <rect x="10" y="75" width="130" height="55" fill="rgba(139, 92, 246, 0.1)" />
        <text x="75" y="108" fill="white" fontSize="4" textAnchor="middle" opacity="0.6">BACK ZONE</text>

        {/* Net */}
        <rect x="10" y="38" width="130" height="3" fill="#f97316" />
        <text x="75" y="35" fill="white" fontSize="4" textAnchor="middle" opacity="0.7">NET</text>

        {/* Net height line (for ball comparison) */}
        <line x1="10" y1="42" x2="140" y2="42" stroke="#f97316" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
        <text x="145" y="44" fill="#f97316" fontSize="3" opacity="0.7">Net Top</text>

        {/* Attack line */}
        <line x1="10" y1="75" x2="140" y2="75" stroke="#ef4444" strokeWidth="1.5" />
        <text x="145" y="77" fill="#ef4444" fontSize="4">Attack Line</text>

        {/* Player trajectory */}
        <motion.path
          d={`M ${current.takeoffX},130 Q ${current.takeoffX - 10},${current.takeoffY - 20} ${current.takeoffX},${current.takeoffY}`}
          fill="none"
          stroke={current.isLegal ? "#22c55e" : "#ef4444"}
          strokeWidth="1"
          strokeDasharray="3 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        />

        {/* Take-off point indicator */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <circle 
            cx={current.takeoffX} 
            cy="130" 
            r="4" 
            fill="none" 
            stroke={current.isLegal ? "#22c55e" : "#ef4444"} 
            strokeWidth="1.5" 
            strokeDasharray="2 2"
          />
          <text 
            x={current.takeoffX} 
            y="138" 
            fill={current.isLegal ? "#22c55e" : "#ef4444"} 
            fontSize="3" 
            textAnchor="middle"
          >
            Take-off
          </text>
        </motion.g>

        {/* Player at attack position */}
        <motion.g
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring" }}
        >
          <circle
            cx={current.takeoffX}
            cy={current.takeoffY}
            r="10"
            fill={current.isLegal ? "#8b5cf6" : "#dc2626"}
            stroke="white"
            strokeWidth="1.5"
          />
          <text
            x={current.takeoffX}
            y={current.takeoffY + 3}
            textAnchor="middle"
            fill="white"
            fontSize="7"
            fontWeight="bold"
          >
            6
          </text>
          <text
            x={current.takeoffX}
            y={current.takeoffY - 15}
            textAnchor="middle"
            fill="white"
            fontSize="4"
            opacity="0.8"
          >
            Back Row
          </text>
        </motion.g>

        {/* Ball position */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: "spring" }}
        >
          <circle
            cx={current.takeoffX + 25}
            cy={current.ballY}
            r="6"
            fill="#fbbf24"
            stroke="white"
            strokeWidth="1"
          />
          
          {/* Ball height indicator */}
          <line 
            x1={current.takeoffX + 25} 
            y1={current.ballY} 
            x2={current.takeoffX + 25} 
            y2="42" 
            stroke="white" 
            strokeWidth="0.5" 
            strokeDasharray="2 1"
            opacity="0.5"
          />
          
          <text
            x={current.takeoffX + 35}
            y={current.ballY + 2}
            fill="white"
            fontSize="4"
          >
            {current.ballY < 45 ? "Ball above net" : "Ball below net"}
          </text>
        </motion.g>

        {/* Attack direction arrow */}
        <motion.path
          d={`M ${current.takeoffX + 5},${current.takeoffY - 5} L ${current.takeoffX + 22},${current.ballY + 3}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.5"
          markerEnd="url(#arrowhead)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        />

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#fbbf24" />
          </marker>
        </defs>

        {/* Status box */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <rect 
            x="5" 
            y="5" 
            width="140" 
            height="18" 
            rx="3"
            fill={current.isLegal ? "#166534" : "#991b1b"}
          />
          <text 
            x="75" 
            y="16" 
            textAnchor="middle" 
            fill="white" 
            fontSize="5"
          >
            {current.isLegal ? "✓" : "✕"} {current.label}
          </text>
        </motion.g>

        {/* Legend */}
        <g transform="translate(10, 125)">
          <text fill="white" fontSize="3" opacity="0.6">
            Rule 13.2.2: Back-row attack above net height must take off behind attack line
          </text>
        </g>
      </svg>
    </div>
  );
}

