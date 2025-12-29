"use client";

import { motion } from "framer-motion";

interface BallCrossingProps {
  scenario?: "crossing-space" | "external-space" | "lower-space" | "antenna-touch";
  size?: "sm" | "md" | "lg";
}

export function BallCrossing({ 
  scenario = "crossing-space",
  size = "md" 
}: BallCrossingProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const scenarios = {
    "crossing-space": {
      ballPath: "M 40,80 Q 75,20 110,70",
      ballY: 45,
      isLegal: true,
      label: "Legal: Ball crosses within crossing space"
    },
    "external-space": {
      ballPath: "M 30,70 Q 60,30 20,50",
      ballY: 40,
      isLegal: false,
      label: "Fault: Ball crosses outside antenna"
    },
    "lower-space": {
      ballPath: "M 40,90 Q 75,110 110,95",
      ballY: 100,
      isLegal: false,
      label: "Fault: Ball crosses completely under net"
    },
    "antenna-touch": {
      ballPath: "M 40,70 Q 60,40 25,50",
      ballY: 50,
      isLegal: false,
      label: "Fault: Ball touches antenna"
    }
  };

  const currentScenario = scenarios[scenario];

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 150 130" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="150" height="130" fill="#0f172a" />

        {/* Court surface */}
        <rect x="10" y="85" width="130" height="40" fill="#1e3a5f" opacity="0.5" />
        
        {/* Net posts */}
        <rect x="23" y="40" width="4" height="55" fill="#64748b" />
        <rect x="123" y="40" width="4" height="55" fill="#64748b" />

        {/* Net mesh */}
        <rect x="27" y="50" width="96" height="35" fill="none" stroke="#334155" strokeWidth="0.5" />
        {Array.from({ length: 10 }).map((_, i) => (
          <line 
            key={`v-${i}`}
            x1={27 + i * 10} 
            y1="50" 
            x2={27 + i * 10} 
            y2="85" 
            stroke="#334155" 
            strokeWidth="0.5"
          />
        ))}

        {/* Top band */}
        <rect x="27" y="47" width="96" height="4" fill="white" />

        {/* Antennas */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Left antenna */}
          <rect x="26" y="15" width="2" height="70" fill="#ef4444" />
          {/* Right antenna */}
          <rect x="122" y="15" width="2" height="70" fill="#ef4444" />
        </motion.g>

        {/* Crossing space indicator */}
        <motion.rect
          x="28"
          y="15"
          width="94"
          height="32"
          fill="rgba(34, 197, 94, 0.15)"
          stroke="#22c55e"
          strokeWidth="0.5"
          strokeDasharray="3 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />

        {/* External space indicator (left) */}
        <rect
          x="10"
          y="15"
          width="18"
          height="32"
          fill="rgba(239, 68, 68, 0.1)"
          stroke="#ef4444"
          strokeWidth="0.3"
          strokeDasharray="2 2"
        />

        {/* Lower space indicator */}
        <rect
          x="28"
          y="85"
          width="94"
          height="20"
          fill="rgba(239, 68, 68, 0.1)"
          stroke="#ef4444"
          strokeWidth="0.3"
          strokeDasharray="2 2"
        />

        {/* Ball path */}
        <motion.path
          d={currentScenario.ballPath}
          fill="none"
          stroke={currentScenario.isLegal ? "#22c55e" : "#ef4444"}
          strokeWidth="1.5"
          strokeDasharray="3 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        />

        {/* Ball */}
        <motion.circle
          cx="75"
          cy={currentScenario.ballY}
          r="6"
          fill={currentScenario.isLegal ? "#22c55e" : "#ef4444"}
          stroke="white"
          strokeWidth="1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring" }}
        />
        <motion.text
          x="75"
          y={currentScenario.ballY + 2}
          textAnchor="middle"
          fill="white"
          fontSize="5"
          fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          🏐
        </motion.text>

        {/* Labels */}
        <g fill="white" fontSize="5" opacity="0.7">
          <text x="75" y="12" textAnchor="middle">CEILING</text>
          <text x="75" y="35" textAnchor="middle" fill="#22c55e">Crossing Space</text>
          <text x="17" y="35" textAnchor="middle" fill="#ef4444" fontSize="4">External</text>
          <text x="75" y="98" textAnchor="middle" fill="#ef4444" fontSize="4">Lower Space</text>
        </g>

        {/* Status box */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <rect 
            x="15" 
            y="112" 
            width="120" 
            height="14" 
            rx="2"
            fill={currentScenario.isLegal ? "#166534" : "#991b1b"}
          />
          <text 
            x="75" 
            y="121" 
            textAnchor="middle" 
            fill="white" 
            fontSize="5"
          >
            {currentScenario.isLegal ? "✓" : "✕"} {currentScenario.label}
          </text>
        </motion.g>

        {/* Court labels */}
        <text x="40" y="78" fill="white" fontSize="4" opacity="0.5">Team A</text>
        <text x="100" y="78" fill="white" fontSize="4" opacity="0.5">Team B</text>
      </svg>
    </div>
  );
}

