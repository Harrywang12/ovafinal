"use client";

import { motion } from "framer-motion";

interface CourtLayoutProps {
  showMeasurements?: boolean;
  highlightZone?: "front" | "back" | "service" | "substitution" | "libero" | null;
  size?: "sm" | "md" | "lg";
}

export function CourtLayout({ 
  showMeasurements = true, 
  highlightZone = null,
  size = "md" 
}: CourtLayoutProps) {
  const sizeClasses = {
    sm: "h-48",
    md: "h-64",
    lg: "h-96"
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${sizeClasses[size]}`}>
      <svg viewBox="0 0 240 150" className="w-full h-full">
        <defs>
          <pattern id="courtPattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="#1e3a5f" />
            <line x1="0" y1="10" x2="10" y2="0" stroke="#234b73" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Free zone background */}
        <rect x="10" y="10" width="220" height="130" fill="#0f172a" rx="2" />

        {/* Playing court - 18m x 9m (scaled: 180 x 90) */}
        <motion.rect
          x="30"
          y="30"
          width="180"
          height="90"
          fill="url(#courtPattern)"
          stroke="#3b82f6"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Centre line */}
        <motion.line
          x1="30"
          y1="75"
          x2="210"
          y2="75"
          stroke="white"
          strokeWidth="1.5"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ transformOrigin: "center" }}
        />

        {/* Attack lines (3m from centre = 30 units) */}
        <motion.line
          x1="30"
          y1="45"
          x2="210"
          y2="45"
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="3 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
        <motion.line
          x1="30"
          y1="105"
          x2="210"
          y2="105"
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="3 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />

        {/* Front zone highlights */}
        {highlightZone === "front" && (
          <>
            <motion.rect
              x="30"
              y="45"
              width="180"
              height="30"
              fill="rgba(34, 197, 94, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.rect
              x="30"
              y="75"
              width="180"
              height="30"
              fill="rgba(34, 197, 94, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          </>
        )}

        {/* Service zone highlight */}
        {highlightZone === "service" && (
          <>
            <motion.rect
              x="30"
              y="10"
              width="180"
              height="20"
              fill="rgba(59, 130, 246, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.rect
              x="30"
              y="120"
              width="180"
              height="20"
              fill="rgba(59, 130, 246, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          </>
        )}

        {/* Substitution zone highlight */}
        {highlightZone === "substitution" && (
          <motion.rect
            x="210"
            y="45"
            width="20"
            height="60"
            fill="rgba(168, 85, 247, 0.3)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        {/* Libero replacement zone highlight */}
        {highlightZone === "libero" && (
          <>
            <motion.rect
              x="10"
              y="45"
              width="20"
              height="30"
              fill="rgba(234, 179, 8, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.rect
              x="10"
              y="75"
              width="20"
              height="30"
              fill="rgba(234, 179, 8, 0.3)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          </>
        )}

        {/* Service zone markers */}
        <line x1="30" y1="28" x2="30" y2="30" stroke="white" strokeWidth="0.8" />
        <line x1="210" y1="28" x2="210" y2="30" stroke="white" strokeWidth="0.8" />
        <line x1="30" y1="120" x2="30" y2="122" stroke="white" strokeWidth="0.8" />
        <line x1="210" y1="120" x2="210" y2="122" stroke="white" strokeWidth="0.8" />

        {/* Net indicators */}
        <rect x="28" y="73" width="4" height="4" fill="#f97316" rx="1" />
        <rect x="208" y="73" width="4" height="4" fill="#f97316" rx="1" />
        <line x1="30" y1="75" x2="210" y2="75" stroke="#f97316" strokeWidth="2" opacity="0.8" />

        {/* Measurements */}
        {showMeasurements && (
          <g fill="white" fontSize="6" fontFamily="system-ui">
            {/* Court width */}
            <text x="120" y="128" textAnchor="middle" opacity="0.7">18m</text>
            <line x1="35" y1="125" x2="205" y2="125" stroke="white" strokeWidth="0.3" opacity="0.5" />
            
            {/* Court height */}
            <text x="218" y="75" textAnchor="start" opacity="0.7">9m</text>
            <line x1="215" y1="35" x2="215" y2="115" stroke="white" strokeWidth="0.3" opacity="0.5" />
            
            {/* Attack line distance */}
            <text x="22" y="60" textAnchor="end" opacity="0.6" fontSize="5">3m</text>
            <text x="22" y="90" textAnchor="end" opacity="0.6" fontSize="5">3m</text>
            
            {/* Free zone */}
            <text x="20" y="25" textAnchor="middle" opacity="0.5" fontSize="4">Free Zone 3m</text>
          </g>
        )}

        {/* Zone labels */}
        <g fill="white" fontSize="5" opacity="0.6">
          <text x="120" y="55" textAnchor="middle">FRONT ZONE</text>
          <text x="120" y="38" textAnchor="middle">BACK ZONE</text>
          <text x="120" y="100" textAnchor="middle">FRONT ZONE</text>
          <text x="120" y="115" textAnchor="middle">BACK ZONE</text>
        </g>

        {/* Position numbers */}
        <g fill="white" fontSize="8" fontWeight="bold" opacity="0.9">
          {/* Top court */}
          <text x="55" y="52" textAnchor="middle">4</text>
          <text x="120" y="52" textAnchor="middle">3</text>
          <text x="185" y="52" textAnchor="middle">2</text>
          <text x="55" y="68" textAnchor="middle">5</text>
          <text x="120" y="68" textAnchor="middle">6</text>
          <text x="185" y="68" textAnchor="middle">1</text>
          
          {/* Bottom court (mirrored) */}
          <text x="185" y="85" textAnchor="middle">4</text>
          <text x="120" y="85" textAnchor="middle">3</text>
          <text x="55" y="85" textAnchor="middle">2</text>
          <text x="185" y="100" textAnchor="middle">5</text>
          <text x="120" y="100" textAnchor="middle">6</text>
          <text x="55" y="100" textAnchor="middle">1</text>
        </g>

        {/* Team bench indicators */}
        <rect x="220" y="60" width="15" height="30" fill="#334155" stroke="#475569" strokeWidth="0.5" rx="2" />
        <text x="227" y="78" fill="white" fontSize="4" textAnchor="middle">BENCH</text>

        {/* Scorer's table */}
        <rect x="220" y="45" width="15" height="12" fill="#475569" stroke="#64748b" strokeWidth="0.5" rx="1" />
        <text x="227" y="52" fill="white" fontSize="3" textAnchor="middle">SCORER</text>
      </svg>
    </div>
  );
}

