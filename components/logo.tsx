"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animate?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 40, text: "text-xl" },
  lg: { icon: 56, text: "text-2xl" },
  xl: { icon: 80, text: "text-4xl" },
};

export function Logo({ size = "md", showText = true, animate = true, className = "" }: LogoProps) {
  const { icon, text } = sizes[size];
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Volleyball with Whistle */}
      <motion.div
        whileHover={animate ? { rotate: 360, scale: 1.1 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        style={{ width: icon, height: icon }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c8102e" />
              <stop offset="100%" stopColor="#ff3d5a" />
            </linearGradient>
            <linearGradient id="ballGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f0f0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.25" floodColor="#c8102e" />
            </filter>
          </defs>
          
          {/* Main circle background */}
          <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" filter="url(#shadow)" />
          
          {/* Volleyball pattern - white ball with red seams */}
          <g>
            {/* Ball base */}
            <circle cx="50" cy="50" r="32" fill="url(#ballGradient)" />
            
            {/* Volleyball seam lines - curved paths */}
            <path
              d="M 50 18 Q 30 35, 30 50 Q 30 65, 50 82"
              stroke="#c8102e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 50 18 Q 70 35, 70 50 Q 70 65, 50 82"
              stroke="#c8102e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 22 38 Q 50 45, 78 38"
              stroke="#c8102e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 22 62 Q 50 55, 78 62"
              stroke="#c8102e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          
          {/* Whistle element - small whistle overlay */}
          <g transform="translate(58, 58) rotate(-45)">
            <rect x="0" y="0" width="24" height="12" rx="3" fill="#1a1a2e" />
            <circle cx="20" cy="6" r="5" fill="#1a1a2e" />
            <rect x="18" y="4" width="6" height="4" fill="#1a1a2e" />
            <circle cx="6" cy="6" r="2" fill="#c8102e" />
          </g>
          
          {/* Accent ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="white"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </motion.div>
      
      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-bold ${text} text-primary leading-none`}>
            Volley
          </span>
          <span className={`font-display font-bold ${text} text-secondary leading-none`}>
            Ref Lab
          </span>
        </div>
      )}
    </div>
  );
}

// Simplified icon-only version for favicons/small spaces
export function LogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="logoIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#ff3d5a" />
        </linearGradient>
      </defs>
      
      <circle cx="50" cy="50" r="48" fill="url(#logoIconGradient)" />
      
      <g>
        <circle cx="50" cy="50" r="32" fill="white" />
        <path d="M 50 18 Q 30 35, 30 50 Q 30 65, 50 82" stroke="#c8102e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 50 18 Q 70 35, 70 50 Q 70 65, 50 82" stroke="#c8102e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 22 38 Q 50 45, 78 38" stroke="#c8102e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 22 62 Q 50 55, 78 62" stroke="#c8102e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      
      <g transform="translate(58, 58) rotate(-45)">
        <rect x="0" y="0" width="24" height="12" rx="3" fill="#1a1a2e" />
        <circle cx="20" cy="6" r="5" fill="#1a1a2e" />
        <rect x="18" y="4" width="6" height="4" fill="#1a1a2e" />
        <circle cx="6" cy="6" r="2" fill="#c8102e" />
      </g>
    </svg>
  );
}

// Animated logo for loading states
export function LogoAnimated({ size = 60 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <LogoIcon size={size} />
    </motion.div>
  );
}

