"use client";

import { motion } from "framer-motion";

interface FlagSignalsProps {
  highlightSignal?: "in" | "out" | "touched" | "fault" | "impossible" | null;
  size?: "sm" | "md" | "lg";
}

export function FlagSignals({ 
  highlightSignal = null,
  size = "md" 
}: FlagSignalsProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72"
  };

  const signals = [
    {
      id: "in",
      name: "Ball IN",
      description: "Point flag down toward floor",
      icon: "down",
      rule: "Rule 8.3"
    },
    {
      id: "out",
      name: "Ball OUT",
      description: "Raise flag vertically",
      icon: "up",
      rule: "Rule 8.4"
    },
    {
      id: "touched",
      name: "Ball Touched",
      description: "Raise flag, touch top with palm",
      icon: "touch",
      rule: "Rule 29.2.1.2"
    },
    {
      id: "fault",
      name: "Crossing/Foot Fault",
      description: "Wave flag over head, point at line",
      icon: "wave",
      rule: "Rules 8.4, 12.4.3"
    },
    {
      id: "impossible",
      name: "Judgement Impossible",
      description: "Cross arms and hands in front of chest",
      icon: "cross",
      rule: "-"
    }
  ];

  const renderFlagIcon = (icon: string, x: number, y: number, isHighlighted: boolean) => {
    const flagColor = isHighlighted ? "#fbbf24" : "#ef4444";
    const poleColor = isHighlighted ? "#f59e0b" : "#a3a3a3";

    switch (icon) {
      case "down":
        return (
          <g>
            <line x1={x} y1={y - 15} x2={x} y2={y + 10} stroke={poleColor} strokeWidth="2" />
            <polygon points={`${x},${y + 5} ${x + 10},${y + 10} ${x + 10},${y + 20} ${x},${y + 15}`} fill={flagColor} />
          </g>
        );
      case "up":
        return (
          <g>
            <line x1={x} y1={y - 15} x2={x} y2={y + 15} stroke={poleColor} strokeWidth="2" />
            <polygon points={`${x},${y - 10} ${x + 10},${y - 5} ${x + 10},${y + 5} ${x},${y}`} fill={flagColor} />
          </g>
        );
      case "touch":
        return (
          <g>
            <line x1={x} y1={y - 10} x2={x} y2={y + 15} stroke={poleColor} strokeWidth="2" />
            <polygon points={`${x},${y - 5} ${x + 10},${y} ${x + 10},${y + 10} ${x},${y + 5}`} fill={flagColor} />
            <ellipse cx={x + 5} cy={y - 8} rx="6" ry="4" fill="#fcd34d" opacity="0.8" />
            <text x={x + 5} y={y - 6} fontSize="4" textAnchor="middle">✋</text>
          </g>
        );
      case "wave":
        return (
          <g>
            <motion.g
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ transformOrigin: `${x}px ${y + 15}px` }}
            >
              <line x1={x} y1={y - 10} x2={x} y2={y + 15} stroke={poleColor} strokeWidth="2" />
              <polygon points={`${x},${y - 5} ${x + 12},${y} ${x + 12},${y + 10} ${x},${y + 5}`} fill={flagColor} />
            </motion.g>
          </g>
        );
      case "cross":
        return (
          <g>
            <line x1={x - 8} y1={y - 8} x2={x + 8} y2={y + 8} stroke={poleColor} strokeWidth="3" strokeLinecap="round" />
            <line x1={x + 8} y1={y - 8} x2={x - 8} y2={y + 8} stroke={poleColor} strokeWidth="3" strokeLinecap="round" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 280 130" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="280" height="130" fill="#0f172a" />

        {/* Title */}
        <text x="140" y="15" fill="white" fontSize="7" textAnchor="middle" fontWeight="bold">
          Line Judges&apos; Official Flag Signals
        </text>
        <text x="140" y="24" fill="white" fontSize="4" textAnchor="middle" opacity="0.6">
          Rule 30.2 - Diagram 12 | Flag size: 40 x 40 cm
        </text>

        {/* Signal boxes */}
        {signals.map((signal, idx) => {
          const x = 15 + idx * 53;
          const y = 40;
          const isHighlighted = highlightSignal === signal.id;

          return (
            <motion.g
              key={signal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              {/* Signal box */}
              <rect
                x={x}
                y={y}
                width="50"
                height="75"
                rx="4"
                fill={isHighlighted ? "#1e3a5f" : "#1e293b"}
                stroke={isHighlighted ? "#3b82f6" : "#334155"}
                strokeWidth={isHighlighted ? "2" : "1"}
              />

              {/* Flag icon area */}
              <rect
                x={x + 5}
                y={y + 5}
                width="40"
                height="35"
                rx="2"
                fill="#0f172a"
              />
              {renderFlagIcon(signal.icon, x + 20, y + 22, isHighlighted)}

              {/* Signal name */}
              <text
                x={x + 25}
                y={y + 50}
                fill="white"
                fontSize="5"
                textAnchor="middle"
                fontWeight="bold"
              >
                {signal.name}
              </text>

              {/* Description */}
              <foreignObject x={x + 2} y={y + 53} width="46" height="18">
                <div 
                  style={{ 
                    fontSize: "3.5px", 
                    color: "rgba(255,255,255,0.7)", 
                    textAlign: "center",
                    lineHeight: "1.3"
                  }}
                >
                  {signal.description}
                </div>
              </foreignObject>

              {/* Rule reference */}
              <text
                x={x + 25}
                y={y + 72}
                fill="#6b7280"
                fontSize="3"
                textAnchor="middle"
              >
                {signal.rule}
              </text>
            </motion.g>
          );
        })}

        {/* Footer */}
        <text x="140" y="125" fill="white" fontSize="3.5" textAnchor="middle" opacity="0.5">
          Line judges control: ball in/out, touches, antenna contacts, foot faults, crossing space violations
        </text>
      </svg>
    </div>
  );
}

