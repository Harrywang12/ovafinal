"use client";

import { motion } from "framer-motion";

interface RefereeSignalsProps {
  signal?: "point" | "out" | "four-hits" | "double-contact" | "net-touch" | "rotation-fault";
}

export function RefereeSignals({ signal = "point" }: RefereeSignalsProps) {
  const signals = {
    "point": {
      title: "Point",
      description: "Raise arm on winning side",
      armLeft: "M 45 40 L 45 25 L 48 22",
      armRight: "M 55 40 L 65 50",
      leftHand: { x: 48, y: 20, type: "open" },
    },
    "out": {
      title: "Ball Out",
      description: "Both forearms vertical, palms in",
      armLeft: "M 45 40 L 40 20",
      armRight: "M 55 40 L 60 20",
      leftHand: { x: 40, y: 18, type: "open" },
      rightHand: { x: 60, y: 18, type: "open" },
    },
    "four-hits": {
      title: "Four Hits",
      description: "Four fingers raised",
      armLeft: "M 45 40 L 35 50",
      armRight: "M 55 40 L 60 22",
      rightHand: { x: 60, y: 18, type: "four" },
    },
    "double-contact": {
      title: "Double Contact",
      description: "Two fingers raised",
      armLeft: "M 45 40 L 35 50",
      armRight: "M 55 40 L 60 25",
      rightHand: { x: 60, y: 22, type: "two" },
    },
    "net-touch": {
      title: "Net Touch",
      description: "Touch net on fault side",
      armLeft: "M 45 40 L 35 45",
      armRight: "M 55 40 L 70 35",
      rightHand: { x: 72, y: 35, type: "point" },
      netIndicator: true,
    },
    "rotation-fault": {
      title: "Rotational Fault",
      description: "Circular motion with finger",
      armLeft: "M 45 40 L 35 50",
      armRight: "M 55 40 L 65 30",
      rightHand: { x: 67, y: 28, type: "circle" },
      circleMotion: true,
    },
  };

  const currentSignal = signals[signal];

  return (
    <div className="relative rounded-xl overflow-hidden h-56 bg-gradient-to-b from-slate-800 to-slate-900">
      <svg viewBox="0 0 100 80" className="w-full h-full">
        {/* Background gradient */}
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="80" fill="url(#bgGrad)" />
        
        {/* Referee figure */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Head */}
          <circle cx="50" cy="32" r="6" fill="#fcd34d" stroke="#f59e0b" strokeWidth="0.5" />
          
          {/* Body */}
          <rect x="44" y="38" width="12" height="20" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
          
          {/* Whistle */}
          <circle cx="50" cy="42" r="1.5" fill="#9ca3af" />
          <line x1="50" y1="43.5" x2="50" y2="46" stroke="#9ca3af" strokeWidth="0.5" />
          
          {/* Arms */}
          <motion.path
            d={currentSignal.armLeft}
            stroke="#fcd34d"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          />
          <motion.path
            d={currentSignal.armRight}
            stroke="#fcd34d"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          />
          
          {/* Left hand if specified */}
          {'leftHand' in currentSignal && currentSignal.leftHand && (
            <motion.g
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              {currentSignal.leftHand.type === "open" && (
                <>
                  <ellipse cx={currentSignal.leftHand.x} cy={currentSignal.leftHand.y} rx="3" ry="4" fill="#fcd34d" />
                  <line x1={currentSignal.leftHand.x - 1} y1={currentSignal.leftHand.y - 4} x2={currentSignal.leftHand.x - 1} y2={currentSignal.leftHand.y - 7} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.leftHand.x} y1={currentSignal.leftHand.y - 4} x2={currentSignal.leftHand.x} y2={currentSignal.leftHand.y - 8} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.leftHand.x + 1} y1={currentSignal.leftHand.y - 4} x2={currentSignal.leftHand.x + 1} y2={currentSignal.leftHand.y - 7} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.leftHand.x + 2} y1={currentSignal.leftHand.y - 3} x2={currentSignal.leftHand.x + 2} y2={currentSignal.leftHand.y - 6} stroke="#fcd34d" strokeWidth="1" />
                </>
              )}
            </motion.g>
          )}
          
          {/* Right hand */}
          {'rightHand' in currentSignal && currentSignal.rightHand && (
            <motion.g
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              {currentSignal.rightHand.type === "open" && (
                <>
                  <ellipse cx={currentSignal.rightHand.x} cy={currentSignal.rightHand.y} rx="3" ry="4" fill="#fcd34d" />
                  <line x1={currentSignal.rightHand.x - 1} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x - 1} y2={currentSignal.rightHand.y - 7} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x} y2={currentSignal.rightHand.y - 8} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x + 1} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x + 1} y2={currentSignal.rightHand.y - 7} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x + 2} y1={currentSignal.rightHand.y - 3} x2={currentSignal.rightHand.x + 2} y2={currentSignal.rightHand.y - 6} stroke="#fcd34d" strokeWidth="1" />
                </>
              )}
              {currentSignal.rightHand.type === "four" && (
                <>
                  <ellipse cx={currentSignal.rightHand.x} cy={currentSignal.rightHand.y} rx="3" ry="4" fill="#fcd34d" />
                  <line x1={currentSignal.rightHand.x - 2} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x - 2} y2={currentSignal.rightHand.y - 9} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x - 0.5} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x - 0.5} y2={currentSignal.rightHand.y - 10} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x + 1} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x + 1} y2={currentSignal.rightHand.y - 10} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x + 2.5} y1={currentSignal.rightHand.y - 3} x2={currentSignal.rightHand.x + 2.5} y2={currentSignal.rightHand.y - 8} stroke="#fcd34d" strokeWidth="1" />
                </>
              )}
              {currentSignal.rightHand.type === "two" && (
                <>
                  <ellipse cx={currentSignal.rightHand.x} cy={currentSignal.rightHand.y} rx="3" ry="4" fill="#fcd34d" />
                  <line x1={currentSignal.rightHand.x - 1} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x - 2} y2={currentSignal.rightHand.y - 10} stroke="#fcd34d" strokeWidth="1" />
                  <line x1={currentSignal.rightHand.x + 1} y1={currentSignal.rightHand.y - 4} x2={currentSignal.rightHand.x + 2} y2={currentSignal.rightHand.y - 10} stroke="#fcd34d" strokeWidth="1" />
                </>
              )}
              {currentSignal.rightHand.type === "point" && (
                <>
                  <ellipse cx={currentSignal.rightHand.x} cy={currentSignal.rightHand.y} rx="2" ry="3" fill="#fcd34d" />
                  <line x1={currentSignal.rightHand.x + 2} y1={currentSignal.rightHand.y} x2={currentSignal.rightHand.x + 6} y2={currentSignal.rightHand.y} stroke="#fcd34d" strokeWidth="1" />
                </>
              )}
              {currentSignal.rightHand.type === "circle" && (
                <ellipse cx={currentSignal.rightHand.x} cy={currentSignal.rightHand.y} rx="2" ry="3" fill="#fcd34d" />
              )}
            </motion.g>
          )}
          
          {/* Net indicator for net touch */}
          {'netIndicator' in currentSignal && currentSignal.netIndicator && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <rect x="75" y="30" width="20" height="15" fill="none" stroke="#ff6b35" strokeWidth="0.5" />
              <text x="85" y="39" textAnchor="middle" fill="#ff6b35" fontSize="3">
                NET
              </text>
            </motion.g>
          )}
          
          {/* Circle motion indicator */}
          {'circleMotion' in currentSignal && currentSignal.circleMotion && (
            <motion.circle
              cx={currentSignal.rightHand?.x || 67}
              cy={currentSignal.rightHand?.y || 28}
              r="6"
              fill="none"
              stroke="#c8102e"
              strokeWidth="1"
              strokeDasharray="2 1"
              initial={{ pathLength: 0, rotate: 0 }}
              animate={{ pathLength: 1, rotate: 360 }}
              transition={{ delay: 0.9, duration: 1, repeat: Infinity }}
            />
          )}
        </motion.g>
        
        {/* Title and description */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <text x="50" y="68" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">
            {currentSignal.title}
          </text>
          <text x="50" y="74" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3">
            {currentSignal.description}
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

