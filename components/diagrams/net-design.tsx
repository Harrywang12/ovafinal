"use client";

import { motion } from "framer-motion";

interface NetDesignProps {
  showMeasurements?: boolean;
  highlightPart?: "antenna" | "sideBand" | "topBand" | "posts" | null;
  gender?: "men" | "women";
  size?: "sm" | "md" | "lg";
}

export function NetDesign({ 
  showMeasurements = true, 
  highlightPart = null,
  gender = "men",
  size = "md" 
}: NetDesignProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const netHeight = gender === "men" ? "2.43m" : "2.24m";
  const netHeightValue = gender === "men" ? 2.43 : 2.24;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 300 180" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="300" height="180" fill="#0f172a" />

        {/* Floor line */}
        <line x1="20" y1="160" x2="280" y2="160" stroke="#475569" strokeWidth="2" />
        <text x="150" y="175" fill="#64748b" fontSize="8" textAnchor="middle">Court Surface</text>

        {/* Posts */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left post */}
          <rect 
            x="25" 
            y="50" 
            width="8" 
            height="110" 
            fill={highlightPart === "posts" ? "#f59e0b" : "#64748b"}
            stroke={highlightPart === "posts" ? "#fbbf24" : "#94a3b8"}
            strokeWidth="1"
            rx="2"
          />
          <circle cx="29" cy="55" r="3" fill="#94a3b8" />
          
          {/* Right post */}
          <rect 
            x="267" 
            y="50" 
            width="8" 
            height="110" 
            fill={highlightPart === "posts" ? "#f59e0b" : "#64748b"}
            stroke={highlightPart === "posts" ? "#fbbf24" : "#94a3b8"}
            strokeWidth="1"
            rx="2"
          />
          <circle cx="271" cy="55" r="3" fill="#94a3b8" />
        </motion.g>

        {/* Net mesh */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <rect x="35" y="65" width="230" height="45" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          
          {/* Mesh pattern */}
          {Array.from({ length: 23 }).map((_, i) => (
            <line 
              key={`v-${i}`}
              x1={35 + i * 10} 
              y1="65" 
              x2={35 + i * 10} 
              y2="110" 
              stroke="#334155" 
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line 
              key={`h-${i}`}
              x1="35" 
              y1={65 + i * 10} 
              x2="265" 
              y2={65 + i * 10} 
              stroke="#334155" 
              strokeWidth="0.5"
            />
          ))}
        </motion.g>

        {/* Top band (7cm white canvas) */}
        <motion.rect
          x="35"
          y="58"
          width="230"
          height="7"
          fill={highlightPart === "topBand" ? "#60a5fa" : "white"}
          stroke={highlightPart === "topBand" ? "#3b82f6" : "#e2e8f0"}
          strokeWidth="0.5"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ transformOrigin: "center" }}
        />

        {/* Cable line */}
        <line x1="30" y1="60" x2="270" y2="60" stroke="#94a3b8" strokeWidth="1" />

        {/* Bottom rope */}
        <line x1="35" y1="112" x2="265" y2="112" stroke="#94a3b8" strokeWidth="0.8" />

        {/* Side bands (5cm x 1m white) */}
        <motion.rect
          x="35"
          y="58"
          width="3"
          height="54"
          fill={highlightPart === "sideBand" ? "#22c55e" : "white"}
          stroke={highlightPart === "sideBand" ? "#16a34a" : "#e2e8f0"}
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        />
        <motion.rect
          x="262"
          y="58"
          width="3"
          height="54"
          fill={highlightPart === "sideBand" ? "#22c55e" : "white"}
          stroke={highlightPart === "sideBand" ? "#16a34a" : "#e2e8f0"}
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        />

        {/* Antennas (1.80m tall, top 80cm striped) */}
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          {/* Left antenna */}
          <rect 
            x="36" 
            y="20" 
            width="2" 
            height="92" 
            fill={highlightPart === "antenna" ? "#ef4444" : "#64748b"}
          />
          {/* Striped section (top 80cm = ~35 units) */}
          {Array.from({ length: 4 }).map((_, i) => (
            <rect 
              key={`la-${i}`}
              x="36" 
              y={20 + i * 10} 
              width="2" 
              height="5" 
              fill={highlightPart === "antenna" ? "#ef4444" : "#dc2626"}
            />
          ))}

          {/* Right antenna */}
          <rect 
            x="262" 
            y="20" 
            width="2" 
            height="92" 
            fill={highlightPart === "antenna" ? "#ef4444" : "#64748b"}
          />
          {Array.from({ length: 4 }).map((_, i) => (
            <rect 
              key={`ra-${i}`}
              x="262" 
              y={20 + i * 10} 
              width="2" 
              height="5" 
              fill={highlightPart === "antenna" ? "#ef4444" : "#dc2626"}
            />
          ))}
        </motion.g>

        {/* Measurements */}
        {showMeasurements && (
          <g fill="white" fontSize="7" fontFamily="system-ui">
            {/* Net height */}
            <text x="285" y="90" opacity="0.8">{netHeight}</text>
            <line x1="280" y1="60" x2="280" y2="160" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <line x1="277" y1="60" x2="283" y2="60" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <line x1="277" y1="160" x2="283" y2="160" stroke="white" strokeWidth="0.5" opacity="0.5" />

            {/* Post height */}
            <text x="15" y="90" opacity="0.7" fontSize="6">2.55m</text>
            <line x1="20" y1="50" x2="20" y2="160" stroke="white" strokeWidth="0.3" opacity="0.4" />

            {/* Net width */}
            <text x="150" y="130" textAnchor="middle" opacity="0.7">9.50-10m</text>
            <line x1="40" y1="125" x2="260" y2="125" stroke="white" strokeWidth="0.3" opacity="0.4" />

            {/* Net depth */}
            <text x="275" y="82" opacity="0.6" fontSize="5">1m</text>

            {/* Antenna height above net */}
            <text x="45" y="40" opacity="0.6" fontSize="5">80cm above</text>
            
            {/* Top band */}
            <text x="150" y="55" textAnchor="middle" opacity="0.6" fontSize="5">7cm white band</text>

            {/* Antenna specs */}
            <text x="55" y="18" opacity="0.6" fontSize="5">Antenna: 1.80m x 10mm</text>
          </g>
        )}

        {/* Labels */}
        <g fill="white" fontSize="6" opacity="0.7">
          <text x="150" y="145" textAnchor="middle">CROSSING SPACE (between antennas)</text>
        </g>

        {/* Net height indicator line */}
        <line 
          x1="35" 
          y1={65} 
          x2="265" 
          y2={65} 
          stroke="#f59e0b" 
          strokeWidth="1.5" 
          strokeDasharray="4 2"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

