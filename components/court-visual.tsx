"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";

type Point = { x: number; y: number };

const defaultPath: Point[] = [
  { x: 10, y: 80 },
  { x: 50, y: 50 },
  { x: 90, y: 30 }
];

export function CourtVisual({ onChoice }: { onChoice?: (call: string) => void }) {
  const [path, setPath] = useState<Point[]>(defaultPath);
  const [call, setCall] = useState("In");
  const [isAnimating, setIsAnimating] = useState(false);

  const updatePoint = (idx: number, coord: Partial<Point>) => {
    setPath((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...coord };
      return copy;
    });
  };

  const resetPath = () => {
    setPath(defaultPath);
    setIsAnimating(false);
  };

  const animatePath = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Visualization
          </p>
          <h3 className="text-lg font-display font-bold text-primary">
            Interactive Court
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={call}
            onChange={(e) => {
              setCall(e.target.value);
              onChoice?.(e.target.value);
            }}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option>In</option>
            <option>Out</option>
            <option>Touch</option>
            <option>Net Fault</option>
            <option>Rotational Fault</option>
          </select>
        </div>
      </div>
      
      <div className="relative bg-primary rounded-xl p-4 overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 opacity-30 pointer-events-none bg-gradient-to-br from-accent/20 via-transparent to-secondary/20" />
        
        {/* Court SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-48 relative z-10">
          {/* Court outline */}
          <rect
            x="5"
            y="10"
            width="90"
            height="80"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
          />
          
          {/* Center line */}
          <line
            x1="50"
            y1="10"
            x2="50"
            y2="90"
            stroke="rgba(255,107,53,0.6)"
            strokeWidth="1"
          />
          
          {/* Attack lines */}
          <line
            x1="5"
            y1="35"
            x2="95"
            y2="35"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
          <line
            x1="5"
            y1="65"
            x2="95"
            y2="65"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
          
          {/* Ball path line */}
          <motion.polyline
            points={path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isAnimating ? 1 : 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ff6b35" stopOpacity="1" />
              <stop offset="100%" stopColor="#00b4a6" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Touch points */}
          {path.map((p, idx) => (
            <motion.g key={idx}>
              {/* Outer glow */}
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="none"
                stroke={idx === path.length - 1 ? "#00b4a6" : "#ff6b35"}
                strokeWidth="1"
                opacity="0.3"
                animate={isAnimating ? {
                  r: [4, 8, 4],
                  opacity: [0.3, 0.1, 0.3]
                } : {}}
                transition={{
                  duration: 1,
                  delay: idx * 0.3,
                  repeat: isAnimating ? Infinity : 0
                }}
              />
              {/* Main dot */}
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill={idx === path.length - 1 ? "#00b4a6" : "#ff6b35"}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  y: isAnimating ? [0, -2, 0] : 0
                }}
                transition={{
                  scale: { duration: 0.3, delay: idx * 0.1 },
                  y: { duration: 0.5, delay: idx * 0.2, repeat: isAnimating ? 2 : 0 }
                }}
              />
              {/* Touch number */}
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="6"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            </motion.g>
          ))}
        </svg>
        
        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={animatePath}
              className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium flex items-center gap-2"
            >
              <Play size={14} />
              Animate
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetPath}
              className="px-3 py-2 rounded-lg bg-white/10 text-white/70 text-sm font-medium flex items-center gap-2 hover:bg-white/20 hover:text-white transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </motion.button>
          </div>
          
          <div className="text-right">
            <p className="text-white/40 text-xs">Current call</p>
            <p className="text-white font-semibold">{call}</p>
          </div>
        </div>
      </div>
      
      {/* Touch point editors */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {path.map((p, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-surface border border-border">
            <p className="text-xs font-semibold text-muted mb-2">Touch {idx + 1}</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted">X</label>
                <input
                  type="number"
                  value={p.x}
                  onChange={(e) => updatePoint(idx, { x: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  min={0}
                  max={100}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted">Y</label>
                <input
                  type="number"
                  value={p.y}
                  onChange={(e) => updatePoint(idx, { y: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted mt-4 text-center">
        Adjust coordinates to simulate ball path and select the correct call for this sequence.
      </p>
    </div>
  );
}
