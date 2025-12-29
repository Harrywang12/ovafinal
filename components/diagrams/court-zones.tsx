"use client";

import { motion } from "framer-motion";

interface CourtZonesProps {
  highlightZones?: number[];
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CourtZones({ highlightZones = [], showLabels = true, size = "md" }: CourtZonesProps) {
  const sizeClasses = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64"
  };

  const zones = [
    { id: 4, x: 5, y: 10, width: 30, height: 25, label: "4", row: "front" },
    { id: 3, x: 35, y: 10, width: 30, height: 25, label: "3", row: "front" },
    { id: 2, x: 65, y: 10, width: 30, height: 25, label: "2", row: "front" },
    { id: 5, x: 5, y: 35, width: 30, height: 30, label: "5", row: "back" },
    { id: 6, x: 35, y: 35, width: 30, height: 30, label: "6", row: "back" },
    { id: 1, x: 65, y: 35, width: 30, height: 30, label: "1", row: "back" },
  ];

  return (
    <div className={`relative rounded-xl overflow-hidden ${sizeClasses[size]}`}>
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Court background */}
        <rect x="0" y="0" width="100" height="70" fill="#1e3a5f" />
        
        {/* Court outline */}
        <rect
          x="5"
          y="5"
          width="90"
          height="60"
          fill="none"
          stroke="white"
          strokeWidth="0.8"
        />
        
        {/* Attack line */}
        <line
          x1="5"
          y1="30"
          x2="95"
          y2="30"
          stroke="white"
          strokeWidth="0.5"
          strokeDasharray="2 1"
        />
        
        {/* Center marks */}
        <line
          x1="50"
          y1="5"
          x2="50"
          y2="65"
          stroke="white"
          strokeWidth="0.3"
          strokeDasharray="1 2"
          opacity="0.4"
        />
        
        {/* Zone rectangles */}
        {zones.map((zone) => {
          const isHighlighted = highlightZones.includes(zone.id);
          return (
            <motion.g key={zone.id}>
              <motion.rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill={isHighlighted ? "rgba(200, 16, 46, 0.5)" : "transparent"}
                stroke={isHighlighted ? "#c8102e" : "rgba(255,255,255,0.2)"}
                strokeWidth={isHighlighted ? "1" : "0.3"}
                rx="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: zone.id * 0.1 }}
              />
              {showLabels && (
                <motion.text
                  x={zone.x + zone.width / 2}
                  y={zone.y + zone.height / 2 + 3}
                  textAnchor="middle"
                  fill={isHighlighted ? "white" : "rgba(255,255,255,0.7)"}
                  fontSize="10"
                  fontWeight="bold"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: zone.id * 0.1 + 0.3 }}
                >
                  {zone.label}
                </motion.text>
              )}
            </motion.g>
          );
        })}
        
        {/* Row labels */}
        <text x="50" y="20" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5">
          FRONT ROW
        </text>
        <text x="50" y="55" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="5">
          BACK ROW
        </text>
        
        {/* Net indicator */}
        <rect x="0" y="3" width="100" height="2" fill="#ff6b35" opacity="0.8" />
        <text x="50" y="2" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3">
          NET
        </text>
      </svg>
    </div>
  );
}

