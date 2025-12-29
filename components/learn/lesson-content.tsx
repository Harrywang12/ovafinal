"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, AlertCircle, ChevronRight, Book, Leaf } from "lucide-react";
import type { Lesson } from "../../lib/module-content";
import { KeyPointCard } from "./key-point-card";
import { RuleBadge } from "./rule-reference";
import { 
  CourtZones, 
  CourtLayout,
  NetDesign,
  PlayerPositions,
  ServiceZone, 
  RotationPositions, 
  BlockingPositions, 
  LiberoZones,
  RefereeSignals,
  BallCrossing,
  CompletedBlock,
  BackRowAttack,
  CollectiveScreen,
  SanctionCards,
  HandSignals,
  FlagSignals
} from "../diagrams";

interface LessonContentProps {
  lesson: Lesson;
  moduleColor: string;
  onNext?: () => void;
  hasNext: boolean;
}

// Map diagram types to components
function getDiagramComponent(diagramType: string) {
  const diagramMap: Record<string, React.ReactNode> = {
    // Facilities & Equipment
    "court-layout": <CourtLayout showMeasurements size="lg" />,
    "net-design": <NetDesign showMeasurements size="lg" />,
    
    // Positions & Rotation
    "player-positions": <PlayerPositions showOverlapExample="correct" size="lg" />,
    "court-positions": <CourtZones showLabels size="lg" />,
    "overlap-rule": <PlayerPositions showOverlapExample="fault-front-back" size="lg" />,
    "rotational-fault": <RotationPositions showArrows currentRotation={1} />,
    "positional-strategy": <RotationPositions showArrows />,
    
    // Service
    "service-zone": <ServiceZone showServer showTimeline />,
    "service-execution": <ServiceZone showServer={false} showTimeline={false} />,
    "service-faults": <ServiceZone showServer showTimeline />,
    "receiving-position": <CourtZones highlightZones={[1, 5, 6]} showLabels />,
    
    // Ball at Net & Playing Actions
    "ball-crossing": <BallCrossing scenario="crossing-space" size="lg" />,
    "collective-screen": <CollectiveScreen scenario="legal" size="lg" />,
    "completed-block": <CompletedBlock scenario="double" size="lg" />,
    "back-row-attack": <BackRowAttack scenario="legal-behind-line" size="lg" />,
    
    // Blocking
    "block-definition": <BlockingPositions blockType="double" showAttacker />,
    "block-contact": <CompletedBlock scenario="triple" showHitCount size="lg" />,
    "back-row-block": <CompletedBlock scenario="back-row-fault" size="lg" />,
    "blocking-serve": <BlockingPositions blockType="double" showAttacker={false} />,
    
    // Faults
    "four-hits": <CourtZones highlightZones={[2, 3, 4]} showLabels />,
    "catch-carry": <CourtZones showLabels />,
    "double-contact": <CourtZones highlightZones={[3]} showLabels />,
    "net-violations": <BlockingPositions blockType="double" showAttacker />,
    "center-line": <CourtZones highlightZones={[3, 6]} showLabels />,
    
    // Libero
    "libero-basics": <LiberoZones showSettingRestriction={false} showReplacementZone />,
    "libero-restrictions": <LiberoZones showSettingRestriction showReplacementZone={false} />,
    "libero-replacement": <LiberoZones showSettingRestriction={false} showReplacementZone />,
    "libero-setting": <LiberoZones showSettingRestriction showReplacementZone={false} />,
    "injured-libero": <LiberoZones showSettingRestriction={false} showReplacementZone />,
    
    // Conduct & Sanctions
    "sanction-cards": <SanctionCards showType="all" size="lg" />,
    
    // Referee Signals
    "referee-positions": <CourtLayout highlightZone="substitution" size="lg" />,
    "hand-signals": <HandSignals category="all" size="lg" />,
    "flag-signals": <FlagSignals size="lg" />,
    "scoring-signals": <RefereeSignals signal="point" />,
    "fault-signals": <RefereeSignals signal="four-hits" />,
    "attack-block-signals": <RefereeSignals signal="net-touch" />,
    "timeout-sub-signals": <RefereeSignals signal="out" />,
    "positioning-signals": <RefereeSignals signal="rotation-fault" />,
  };
  
  return diagramMap[diagramType] || <CourtZones showLabels />;
}

export function LessonContent({ lesson, moduleColor, onNext, hasNext }: LessonContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lesson.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Lesson header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-semibold uppercase tracking-wider mb-2"
              style={{ color: moduleColor }}
            >
              {lesson.subtitle}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl font-display font-bold text-primary"
            >
              {lesson.title}
            </motion.h2>
          </div>
          
          {/* Rule badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <RuleBadge rule={lesson.ruleRef} size="md" />
          </motion.div>
        </div>
        
        {/* Main content grid */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left column - Main content */}
          <div className="lg:col-span-3 space-y-6">
            {lesson.content.map((paragraph, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.08 }}
                className="text-ink leading-relaxed"
              >
                {paragraph}
              </motion.p>
            ))}
            
            {/* Volleyball Canada Note */}
            {lesson.vcNote && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <Leaf size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                    Volleyball Canada Modification
                  </p>
                  <p className="text-sm text-emerald-800">{lesson.vcNote}</p>
                </div>
              </motion.div>
            )}
            
            {/* Image if available */}
            {lesson.image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="relative rounded-2xl overflow-hidden shadow-lg mt-8"
              >
                <div 
                  className="aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${lesson.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </motion.div>
            )}
          </div>
          
          {/* Right column - Diagram & Key Points */}
          <div className="lg:col-span-2 space-y-6">
            {/* Diagram */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Diagram
              </p>
              {getDiagramComponent(lesson.diagram)}
            </motion.div>
            
            {/* Key Points */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <KeyPointCard points={lesson.keyPoints} color={moduleColor} />
            </motion.div>
            
            {/* Rule Reference */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200"
            >
              <Book size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
                  Official Rule Reference
                </p>
                <p className="text-sm text-blue-800 font-medium">{lesson.ruleRef}</p>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Next lesson button */}
        {hasNext && onNext && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-8 border-t border-border"
          >
            <motion.button
              onClick={onNext}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-3 text-primary font-semibold"
            >
              <BookOpen size={18} />
              Continue to Next Lesson
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
