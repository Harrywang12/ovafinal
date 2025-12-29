import { Variants } from "framer-motion";

// ============================================
// FADE ANIMATIONS
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// SCALE ANIMATIONS
// ============================================

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

export const scaleInRotate: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -5 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// STAGGER CONTAINERS
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

// ============================================
// STAGGER CHILDREN
// ============================================

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const staggerItemFromLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const staggerItemFromRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// TEXT REVEAL ANIMATIONS
// ============================================

export const textRevealContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1
    }
  }
};

export const textRevealChar: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export const wordRevealContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: 30, rotateX: 45 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// IMAGE ANIMATIONS
// ============================================

export const imageReveal: Variants = {
  hidden: { 
    clipPath: "inset(0 100% 0 0)",
    opacity: 0 
  },
  visible: {
    clipPath: "inset(0 0% 0 0)",
    opacity: 1,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
  }
};

export const imageRevealFromBottom: Variants = {
  hidden: { 
    clipPath: "inset(100% 0 0 0)",
    opacity: 0 
  },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    opacity: 1,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
  }
};

export const imagePop: Variants = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============================================
// CARD ANIMATIONS
// ============================================

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -8,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

export const card3DHover = {
  rest: { 
    rotateX: 0, 
    rotateY: 0,
    scale: 1 
  },
  hover: (custom: { x: number; y: number }) => ({
    rotateX: custom.y * 5,
    rotateY: custom.x * 5,
    scale: 1.02,
    transition: { duration: 0.3, ease: "easeOut" }
  })
};

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonTap = {
  scale: 0.97,
  transition: { duration: 0.1 }
};

export const buttonHover = {
  scale: 1.03,
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
};

export const magneticHover = {
  x: 0,
  y: 0,
  transition: { type: "spring", stiffness: 150, damping: 15 }
};

// ============================================
// PAGE TRANSITIONS
// ============================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
};

// ============================================
// SCROLL-TRIGGERED ANIMATIONS
// ============================================

export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1] 
    }
  }
};

export const scrollRevealScale: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1] 
    }
  }
};

// ============================================
// UTILITY: Create variants with custom delays
// ============================================

export const createDelayedVariant = (
  baseVariant: Variants,
  delay: number
): Variants => {
  const result: Variants = {};
  for (const key in baseVariant) {
    const variant = baseVariant[key];
    if (typeof variant === "object" && variant !== null && "transition" in variant) {
      result[key] = {
        ...variant,
        transition: {
          ...(variant.transition as object),
          delay
        }
      };
    } else {
      result[key] = variant;
    }
  }
  return result;
};

// ============================================
// SPRING CONFIGS
// ============================================

export const springConfigs = {
  gentle: { type: "spring", stiffness: 120, damping: 14 },
  wobbly: { type: "spring", stiffness: 180, damping: 12 },
  stiff: { type: "spring", stiffness: 300, damping: 20 },
  slow: { type: "spring", stiffness: 80, damping: 20 }
};

// ============================================
// EASING PRESETS
// ============================================

export const easings = {
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  spring: [0.175, 0.885, 0.32, 1.275]
};

// ============================================
// RULEBOOK SPECIFIC ANIMATIONS
// ============================================

// Rule number highlight animation
export const ruleHighlight: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
    backgroundColor: "rgba(59, 130, 246, 0)"
  },
  visible: {
    opacity: 1,
    scale: 1,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    backgroundColor: ["rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 0.4)", "rgba(59, 130, 246, 0.2)"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Card flip animation for sanctions display
export const cardFlip: Variants = {
  hidden: { 
    rotateY: -90,
    opacity: 0
  },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  flip: {
    rotateY: [0, 180, 360],
    transition: {
      duration: 0.8,
      ease: "easeInOut"
    }
  }
};

// Yellow card animation
export const yellowCard: Variants = {
  hidden: { 
    y: -50, 
    opacity: 0,
    rotate: -15
  },
  visible: {
    y: 0,
    opacity: 1,
    rotate: 0,
    transition: { 
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  },
  raise: {
    y: -20,
    rotate: 5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

// Red card animation
export const redCard: Variants = {
  hidden: { 
    y: -50, 
    opacity: 0,
    rotate: 15
  },
  visible: {
    y: 0,
    opacity: 1,
    rotate: 0,
    transition: { 
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  },
  raise: {
    y: -20,
    rotate: -5,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

// Position swap animation for rotation
export const positionSwap: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.5
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  rotate: {
    rotate: 60,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

// Signal demonstration animation
export const signalDemo: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  demonstrate: {
    y: [0, -10, 0],
    scale: [1, 1.1, 1],
    transition: {
      duration: 1,
      ease: "easeInOut",
      repeat: 2
    }
  }
};

// Zone highlight animation for court diagrams
export const zoneHighlight: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.4
    }
  },
  glow: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0)",
      "0 0 20px 5px rgba(59, 130, 246, 0.4)",
      "0 0 0 0 rgba(59, 130, 246, 0)"
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Chapter card animation
export const chapterCard: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Lesson tab animation
export const lessonTab: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { 
      duration: 0.4, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  active: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 1)",
    transition: {
      duration: 0.2
    }
  }
};

// Diagram reveal animation
export const diagramReveal: Variants = {
  hidden: { 
    opacity: 0, 
    clipPath: "inset(0 100% 0 0)"
  },
  visible: {
    opacity: 1,
    clipPath: "inset(0 0% 0 0)",
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

