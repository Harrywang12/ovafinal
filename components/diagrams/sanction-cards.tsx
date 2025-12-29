"use client";

import { motion } from "framer-motion";

interface SanctionCardsProps {
  showType?: "warning" | "penalty" | "expulsion" | "disqualification" | "all";
  size?: "sm" | "md" | "lg";
}

export function SanctionCards({ 
  showType = "all",
  size = "md" 
}: SanctionCardsProps) {
  const sizeClasses = {
    sm: "h-48",
    md: "h-64",
    lg: "h-80"
  };

  const sanctions = [
    {
      id: "warning",
      label: "Warning",
      cards: ["yellow"],
      description: "Minor misconduct (Stage 2)",
      consequence: "No penalty",
      color: "#eab308"
    },
    {
      id: "penalty",
      label: "Penalty",
      cards: ["red"],
      description: "First rude conduct",
      consequence: "Point + service to opponent",
      color: "#dc2626"
    },
    {
      id: "expulsion",
      label: "Expulsion",
      cards: ["red", "yellow-joint"],
      description: "Offensive conduct / 2nd rude",
      consequence: "Leave for rest of set",
      color: "#c2410c"
    },
    {
      id: "disqualification",
      label: "Disqualification",
      cards: ["red", "yellow-separate"],
      description: "Aggression / 2nd offensive / 3rd rude",
      consequence: "Leave for rest of match",
      color: "#7f1d1d"
    }
  ];

  const filteredSanctions = showType === "all" 
    ? sanctions 
    : sanctions.filter(s => s.id === showType);

  const renderCard = (type: string, x: number, y: number, idx: number) => {
    const isYellow = type.includes("yellow");
    const isJoint = type === "yellow-joint";
    const isSeparate = type === "yellow-separate";
    
    return (
      <motion.g
        key={`${type}-${idx}`}
        initial={{ opacity: 0, y: -10, rotate: -10 }}
        animate={{ opacity: 1, y: 0, rotate: isJoint ? -5 : isSeparate ? 15 : 0 }}
        transition={{ delay: idx * 0.1 + 0.3, type: "spring" }}
      >
        <rect
          x={x + (isSeparate ? 8 : isJoint ? -3 : 0)}
          y={y}
          width="12"
          height="18"
          rx="1.5"
          fill={isYellow ? "#eab308" : "#dc2626"}
          stroke="white"
          strokeWidth="0.8"
        />
        {/* Card shine effect */}
        <rect
          x={x + (isSeparate ? 9 : isJoint ? -2 : 1)}
          y={y + 1}
          width="3"
          height="6"
          rx="0.5"
          fill="white"
          opacity="0.3"
        />
      </motion.g>
    );
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 200 160" className="w-full h-full">
        {/* Background */}
        <rect x="0" y="0" width="200" height="160" fill="#0f172a" />

        {/* Title */}
        <text x="100" y="15" fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">
          Misconduct Sanctions Scale
        </text>
        <text x="100" y="24" fill="white" fontSize="4" textAnchor="middle" opacity="0.6">
          Rule 21.3 - Progressive sanctions for misconduct
        </text>

        {/* Sanction rows */}
        {filteredSanctions.map((sanction, idx) => {
          const y = 35 + idx * 30;
          
          return (
            <motion.g
              key={sanction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
            >
              {/* Row background */}
              <rect
                x="10"
                y={y}
                width="180"
                height="28"
                rx="4"
                fill={sanction.color}
                opacity="0.2"
              />

              {/* Cards */}
              <g transform={`translate(20, ${y + 5})`}>
                {sanction.cards.map((card, cardIdx) => renderCard(card, cardIdx * 15, 0, cardIdx))}
              </g>

              {/* Sanction name */}
              <text
                x="55"
                y={y + 12}
                fill="white"
                fontSize="6"
                fontWeight="bold"
              >
                {sanction.label}
              </text>

              {/* Description */}
              <text
                x="55"
                y={y + 21}
                fill="white"
                fontSize="4"
                opacity="0.7"
              >
                {sanction.description}
              </text>

              {/* Consequence */}
              <text
                x="185"
                y={y + 16}
                fill="white"
                fontSize="4"
                textAnchor="end"
                opacity="0.8"
              >
                → {sanction.consequence}
              </text>
            </motion.g>
          );
        })}

        {/* Legend */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <rect x="10" y="145" width="180" height="12" rx="2" fill="#1e293b" />
          
          <rect x="15" y="148" width="8" height="6" rx="1" fill="#eab308" />
          <text x="26" y="153" fill="white" fontSize="3.5">Yellow = Warning</text>
          
          <rect x="65" y="148" width="8" height="6" rx="1" fill="#dc2626" />
          <text x="76" y="153" fill="white" fontSize="3.5">Red = Penalty</text>
          
          <rect x="115" y="148" width="6" height="6" rx="1" fill="#dc2626" transform="rotate(-5 118 151)" />
          <rect x="118" y="148" width="6" height="6" rx="1" fill="#eab308" transform="rotate(-5 121 151)" />
          <text x="128" y="153" fill="white" fontSize="3.5">Joint = Expulsion</text>
          
          <rect x="168" y="146" width="6" height="6" rx="1" fill="#dc2626" />
          <rect x="175" y="150" width="6" height="6" rx="1" fill="#eab308" />
          <text x="184" y="153" fill="white" fontSize="3.5">Sep.</text>
        </motion.g>
      </svg>
    </div>
  );
}

