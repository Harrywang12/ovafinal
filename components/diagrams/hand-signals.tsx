"use client";

import { motion } from "framer-motion";

interface HandSignalsProps {
  category?: "scoring" | "faults" | "service" | "game-management" | "all";
  highlightSignal?: string | null;
  size?: "sm" | "md" | "lg";
}

export function HandSignals({ 
  category = "all",
  highlightSignal = null,
  size = "md" 
}: HandSignalsProps) {
  const sizeClasses = {
    sm: "h-64",
    md: "h-96",
    lg: "h-[32rem]"
  };

  const allSignals = [
    // Scoring signals
    { id: "serve", icon: "👉", name: "Team to Serve", desc: "Extend arm to side of serving team", category: "scoring" },
    { id: "ball-in", icon: "👇", name: "Ball IN", desc: "Point arm and fingers at floor", category: "scoring" },
    { id: "ball-out", icon: "🙌", name: "Ball OUT", desc: "Forearms vertical, palms toward body", category: "scoring" },
    { id: "end-set", icon: "✖️", name: "End of Set/Match", desc: "Cross forearms in front of chest", category: "scoring" },
    
    // Fault signals
    { id: "catch", icon: "🤲", name: "Catch/Lift", desc: "Slowly lift forearm, palm up", category: "faults" },
    { id: "double", icon: "✌️", name: "Double Contact", desc: "Raise two fingers spread open", category: "faults" },
    { id: "four-hits", icon: "🖐️", name: "Four Hits", desc: "Raise four fingers spread open", category: "faults" },
    { id: "net-touch", icon: "🕸️", name: "Net Touch", desc: "Indicate side of net with hand", category: "faults" },
    
    // Service signals
    { id: "auth-serve", icon: "🏐", name: "Authorization to Serve", desc: "Move hand toward direction of service", category: "service" },
    { id: "delay-serve", icon: "8️⃣", name: "Delay in Service", desc: "Raise eight fingers spread open", category: "service" },
    { id: "screen", icon: "🚧", name: "Screening", desc: "Raise both arms vertically, palms forward", category: "service" },
    
    // Game management
    { id: "timeout", icon: "🅃", name: "Time-out", desc: "Form T with hands", category: "game-management" },
    { id: "sub", icon: "🔄", name: "Substitution", desc: "Circular motion of forearms", category: "game-management" },
    { id: "rotation", icon: "🔃", name: "Rotational Fault", desc: "Circular motion with forefinger", category: "game-management" },
    { id: "line-fault", icon: "📍", name: "Line Violation", desc: "Point at the line", category: "game-management" },
    { id: "replay", icon: "👍👍", name: "Double Fault/Replay", desc: "Raise both thumbs", category: "game-management" },
  ];

  const filteredSignals = category === "all" 
    ? allSignals 
    : allSignals.filter(s => s.category === category);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "scoring": return "#22c55e";
      case "faults": return "#ef4444";
      case "service": return "#3b82f6";
      case "game-management": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 280 200" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="280" height="200" fill="#0f172a" />

        {/* Title */}
        <text x="140" y="15" fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">
          Official Referee Hand Signals
        </text>
        <text x="140" y="24" fill="white" fontSize="4" textAnchor="middle" opacity="0.6">
          Rule 30.1 - Diagram 11
        </text>

        {/* Category legend */}
        <g transform="translate(10, 30)">
          {[
            { cat: "scoring", label: "Scoring", color: "#22c55e" },
            { cat: "faults", label: "Faults", color: "#ef4444" },
            { cat: "service", label: "Service", color: "#3b82f6" },
            { cat: "game-management", label: "Game Mgmt", color: "#f59e0b" }
          ].map((item, idx) => (
            <g key={item.cat} transform={`translate(${idx * 65}, 0)`}>
              <rect x="0" y="0" width="8" height="8" rx="1" fill={item.color} opacity="0.8" />
              <text x="11" y="7" fill="white" fontSize="4">{item.label}</text>
            </g>
          ))}
        </g>

        {/* Signal grid */}
        {filteredSignals.map((signal, idx) => {
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          const x = 15 + col * 68;
          const y = 50 + row * 35;
          const isHighlighted = highlightSignal === signal.id;

          return (
            <motion.g
              key={signal.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              {/* Signal box */}
              <rect
                x={x}
                y={y}
                width="62"
                height="32"
                rx="4"
                fill={isHighlighted ? getCategoryColor(signal.category) : "#1e293b"}
                stroke={getCategoryColor(signal.category)}
                strokeWidth={isHighlighted ? "2" : "0.5"}
                opacity={isHighlighted ? "1" : "0.8"}
              />

              {/* Icon */}
              <text
                x={x + 12}
                y={y + 18}
                fontSize="14"
                textAnchor="middle"
              >
                {signal.icon}
              </text>

              {/* Name */}
              <text
                x={x + 24}
                y={y + 12}
                fill="white"
                fontSize="4.5"
                fontWeight="bold"
              >
                {signal.name}
              </text>

              {/* Description (truncated) */}
              <text
                x={x + 24}
                y={y + 20}
                fill="white"
                fontSize="3"
                opacity="0.7"
              >
                {signal.desc.length > 28 ? signal.desc.slice(0, 28) + "..." : signal.desc}
              </text>

              {/* Category indicator */}
              <circle
                cx={x + 58}
                cy={y + 4}
                r="2"
                fill={getCategoryColor(signal.category)}
              />
            </motion.g>
          );
        })}

        {/* Footer note */}
        <text x="140" y="195" fill="white" fontSize="3.5" textAnchor="middle" opacity="0.5">
          Signals should be held for 2-3 seconds | F = First Referee | S = Second Referee
        </text>
      </svg>
    </div>
  );
}

