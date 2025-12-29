"use client";

import { motion } from "framer-motion";

interface RotationPositionsProps {
  currentRotation?: number;
  showArrows?: boolean;
  highlightPosition?: number;
}

export function RotationPositions({ 
  currentRotation = 1, 
  showArrows = true,
  highlightPosition 
}: RotationPositionsProps) {
  const positions = [
    { id: 4, x: 20, y: 20, label: "4", role: "OH" },
    { id: 3, x: 50, y: 20, label: "3", role: "MB" },
    { id: 2, x: 80, y: 20, label: "2", role: "OPP" },
    { id: 5, x: 20, y: 50, label: "5", role: "L/DS" },
    { id: 6, x: 50, y: 50, label: "6", role: "S" },
    { id: 1, x: 80, y: 50, label: "1", role: "OH" },
  ];

  // Rotation arrows
  const arrowPath = "M 80,55 C 85,60 85,65 80,65 L 75,65";
  const rotationArrows = [
    { from: 2, to: 1, path: "M 80,25 L 80,45" },
    { from: 1, to: 6, path: "M 75,50 L 55,50" },
    { from: 6, to: 5, path: "M 45,50 L 25,50" },
    { from: 5, to: 4, path: "M 20,45 L 20,25" },
    { from: 4, to: 3, path: "M 25,20 L 45,20" },
    { from: 3, to: 2, path: "M 55,20 L 75,20" },
  ];

  return (
    <div className="relative rounded-xl overflow-hidden h-48">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Court background */}
        <rect x="0" y="0" width="100" height="70" fill="#1e3a5f" />
        
        {/* Court outline */}
        <rect
          x="10"
          y="10"
          width="80"
          height="55"
          fill="rgba(255,255,255,0.05)"
          stroke="white"
          strokeWidth="0.8"
        />
        
        {/* Attack line */}
        <line
          x1="10"
          y1="35"
          x2="90"
          y2="35"
          stroke="white"
          strokeWidth="0.5"
          strokeDasharray="2 1"
        />
        
        {/* Rotation arrows */}
        {showArrows && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.5 }}
          >
            {rotationArrows.map((arrow, idx) => (
              <motion.path
                key={idx}
                d={arrow.path}
                fill="none"
                stroke="#ff6b35"
                strokeWidth="1"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.6 + idx * 0.1, duration: 0.3 }}
              />
            ))}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="4"
                markerHeight="4"
                refX="2"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill="#ff6b35" />
              </marker>
            </defs>
          </motion.g>
        )}
        
        {/* Player positions */}
        {positions.map((pos, idx) => {
          const isHighlighted = highlightPosition === pos.id;
          const isServer = pos.id === 1;
          
          return (
            <motion.g
              key={pos.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              {/* Position circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="8"
                fill={isHighlighted ? "#c8102e" : isServer ? "#ff6b35" : "rgba(255,255,255,0.15)"}
                stroke={isHighlighted ? "white" : isServer ? "white" : "rgba(255,255,255,0.4)"}
                strokeWidth="1"
              />
              
              {/* Position number */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="6"
                fontWeight="bold"
              >
                {pos.label}
              </text>
              
              {/* Role label */}
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="3"
              >
                {pos.role}
              </text>
              
              {/* Server indicator */}
              {isServer && (
                <motion.text
                  x={pos.x + 12}
                  y={pos.y}
                  fill="#ff6b35"
                  fontSize="4"
                  fontWeight="bold"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  S
                </motion.text>
              )}
            </motion.g>
          );
        })}
        
        {/* Labels */}
        <text x="50" y="7" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="3">
          NET
        </text>
        <rect x="10" y="8" width="80" height="2" fill="#ff6b35" opacity="0.6" />
        
        {/* Legend */}
        <g transform="translate(3, 3)">
          <text fill="rgba(255,255,255,0.5)" fontSize="2.5">
            Rotate clockwise when winning serve
          </text>
        </g>
      </svg>
    </div>
  );
}

