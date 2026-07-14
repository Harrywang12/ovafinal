"use client";

import { motion } from "framer-motion";
import Image from "next/image";

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
const LOGO_ASPECT_RATIO = 466 / 535;

export function Logo({ size = "md", showText = true, animate = true, className = "" }: LogoProps) {
  const { icon, text } = sizes[size];
  const iconHeight = Math.round(icon * LOGO_ASPECT_RATIO);
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <motion.div
        whileHover={animate ? { rotate: 360, scale: 1.1 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center"
        style={{ width: icon, height: iconHeight }}
      >
        <Image
          src="/logo.png"
          alt="Volley Ref Lab Logo"
          width={icon}
          height={iconHeight}
          className="object-contain"
          priority
        />
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
  const height = Math.round(size * LOGO_ASPECT_RATIO);
  return (
    <div className={`inline-block ${className}`} style={{ width: size }}>
      <Image
        src="/logo.png"
        alt="Volley Ref Lab Logo"
        width={size}
        height={height}
        className="object-contain"
        priority
      />
    </div>
  );
}

// Animated logo for loading states
export function LogoAnimated({ size = 60 }: { size?: number }) {
  const height = Math.round(size * LOGO_ASPECT_RATIO);
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="flex items-center justify-center"
      style={{ width: size, height }}
    >
      <Image
        src="/logo.png"
        alt="Volley Ref Lab Logo"
        width={size}
        height={height}
        className="object-contain"
        priority
      />
    </motion.div>
  );
}
