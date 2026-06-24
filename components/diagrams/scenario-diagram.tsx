"use client";

import { motion } from "framer-motion";

type Scenario =
  | "balls"
  | "teams"
  | "captain-coach"
  | "scoring-flow"
  | "ball-play-sequence"
  | "service-rules"
  | "interruptions"
  | "substitution"
  | "exceptional-interruptions"
  | "libero-complete"
  | "libero-redesignation"
  | "conduct"
  | "referee-crew"
  | "scorer-table"
  | "scoresheet-before"
  | "scoresheet-toss"
  | "scoresheet-points"
  | "deciding-set"
  | "scoresheet-timeouts"
  | "scoresheet-close"
  | "rallyball-4v4-court"
  | "rallyball-4v4-formation"
  | "tripleball"
  | "rallyball-rules"
  | "rallyball-6v6-court"
  | "rallyball-6v6-tripleball"
  | "rallyball-6v6-reception"
  | "free-ball-tosser"
  | "beach-court"
  | "beach-teams"
  | "beach-scoring"
  | "beach-ball-handling"
  | "beach-service-attack";

interface ScenarioDiagramProps {
  scenario: Scenario;
  size?: "md" | "lg";
}

const scenarioCopy: Record<Scenario, { title: string; subtitle: string; tags: string[] }> = {
  balls: { title: "Match Balls", subtitle: "Same size, weight, pressure, and model", tags: ["65-67 cm", "260-280 g", "4.26-4.61 psi"] },
  teams: { title: "Team Bench Control", subtitle: "Only registered participants enter the control area", tags: ["12 on sheet", "bench", "warm-up"] },
  "captain-coach": { title: "Team Leaders", subtitle: "Captain speaks to referees; coach manages lineups", tags: ["captain", "coach", "requests"] },
  "scoring-flow": { title: "Rally Point Flow", subtitle: "Every rally gives one point and possible service change", tags: ["rally", "point", "serve"] },
  "ball-play-sequence": { title: "Three Contacts", subtitle: "Team contacts are tracked before the ball crosses", tags: ["1st", "2nd", "3rd"] },
  "service-rules": { title: "Service Execution", subtitle: "Server acts from the service zone within the service window", tags: ["order", "8 sec", "foot fault"] },
  interruptions: { title: "Regular Interruptions", subtitle: "Requests happen only while the ball is out of play", tags: ["time-out", "sub", "sequence"] },
  substitution: { title: "Substitution Zone", subtitle: "Players enter at the scorer-side attack line extension", tags: ["entry", "exit", "scorer"] },
  "exceptional-interruptions": { title: "Exceptional Stops", subtitle: "Injury, interference, and intervals pause normal flow", tags: ["injury", "interval", "replay"] },
  "libero-complete": { title: "Libero Zones", subtitle: "Replacement path and front-zone restrictions", tags: ["back row", "replacement", "attack limit"] },
  "libero-redesignation": { title: "Libero Re-designation", subtitle: "Unavailable libero is replaced through recorded procedure", tags: ["unavailable", "new libero", "record"] },
  conduct: { title: "Conduct Control", subtitle: "Game captain communication and bench discipline", tags: ["captain", "bench", "sanction"] },
  "referee-crew": { title: "Refereeing Corps", subtitle: "R1, R2, scorer, assistant scorer, and line judges", tags: ["R1", "R2", "scorer"] },
  "scorer-table": { title: "Scorer Team", subtitle: "Scoresheet, libero tracking, scoreboard, and requests", tags: ["sheet", "libero", "score"] },
  "scoresheet-before": { title: "Before Match", subtitle: "Record match identity, teams, roster, and officials", tags: ["event", "teams", "officials"] },
  "scoresheet-toss": { title: "After Toss", subtitle: "Record first serve, sides, and starting lineups", tags: ["serve", "side", "lineup"] },
  "scoresheet-points": { title: "Recording Points", subtitle: "Track serving order, points, and rotation changes", tags: ["service", "points", "side-out"] },
  "deciding-set": { title: "Deciding Set", subtitle: "Set to 15, two-point lead, court switch procedure", tags: ["15", "switch", "lead"] },
  "scoresheet-timeouts": { title: "Requests on Sheet", subtitle: "Timeouts, substitutions, and exceptional notes", tags: ["T", "S", "notes"] },
  "scoresheet-close": { title: "After Match", subtitle: "Final results, signatures, and sheet verification", tags: ["result", "sign", "verify"] },
  "rallyball-4v4-court": { title: "4v4 Rallyball Court", subtitle: "Smaller court, lower net, entry-level spacing", tags: ["14 x 7", "4 players", "Tripleball"] },
  "rallyball-4v4-formation": { title: "4v4 Formation", subtitle: "Diamond or square formation with rotating roles", tags: ["diamond", "square", "setter"] },
  tripleball: { title: "Tripleball Sequence", subtitle: "Serve rally, free-ball rally, free-ball rally", tags: ["serve", "free ball", "free ball"] },
  "rallyball-rules": { title: "Rallyball Regulations", subtitle: "Development rules promote touches and rotation", tags: ["no libero", "rotation", "serve receive"] },
  "rallyball-6v6-court": { title: "6v6 Rallyball Court", subtitle: "Full court with developmental Tripleball structure", tags: ["18 x 9", "6 players", "full court"] },
  "rallyball-6v6-tripleball": { title: "6v6 Tripleball", subtitle: "Designated setter and service/free-ball sequence", tags: ["setter", "serve", "free ball"] },
  "rallyball-6v6-reception": { title: "Serve Reception", subtitle: "Reception shape stays consistent through the set", tags: ["receive", "setter", "positions"] },
  "free-ball-tosser": { title: "Free Ball Tosser", subtitle: "Consistent tosses start playable free-ball rallies", tags: ["position", "arc", "target"] },
  "beach-court": { title: "Beach Court", subtitle: "16 x 8 sand court with no center line", tags: ["16 x 8", "sand", "no center line"] },
  "beach-teams": { title: "Beach Team", subtitle: "Two players, no substitutions, numbered 1 and 2", tags: ["2 players", "no subs", "barefoot"] },
  "beach-scoring": { title: "Beach Scoring", subtitle: "Sets to 21, deciding set to 15, regular switches", tags: ["21", "15", "switch"] },
  "beach-ball-handling": { title: "Beach Ball Handling", subtitle: "Block counts and open-hand restrictions matter", tags: ["block counts", "no tips", "set line"] },
  "beach-service-attack": { title: "Beach Service & Attack", subtitle: "No positional faults; attack restrictions still apply", tags: ["serve", "attack", "free position"] },
};

const teamA = "#c8102e";
const teamB = "#2563eb";
const line = "#ffffff";
const sand = "#d8b46a";
const court = "#243b5a";
const green = "#22c55e";

function Arrow({ x1, y1, x2, y2, color = "#ff3d5a" }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${x2} ${y2} l -5 -3 l 1 6 z`} fill={color} transform={`rotate(${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI} ${x2} ${y2})`} />
    </g>
  );
}

function Player({ x, y, label, color = teamA }: { x: number; y: number; label: string; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill={color} stroke="white" strokeWidth="1.5" />
      <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="7" fontWeight="700">{label}</text>
    </g>
  );
}

function Tag({ x, y, text, fill = "#ffffff" }: { x: number; y: number; text: string; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y} width="48" height="14" rx="7" fill={fill} opacity="0.92" />
      <text x={x + 24} y={y + 9.5} textAnchor="middle" fill="#1a1a2e" fontSize="5.5" fontWeight="700">{text}</text>
    </g>
  );
}

function CourtBase({ beach = false, compact = false }: { beach?: boolean; compact?: boolean }) {
  return (
    <g>
      <rect x="12" y="24" width="216" height="112" rx="8" fill={beach ? sand : "#0f172a"} />
      <rect x="34" y="42" width="172" height="76" fill={beach ? "#cda45b" : court} stroke={line} strokeWidth="1.5" />
      {!beach && (
        <>
          <line x1="34" y1="80" x2="206" y2="80" stroke="#f97316" strokeWidth="2" />
          <line x1="34" y1="64" x2="206" y2="64" stroke={line} strokeWidth="1" strokeDasharray="4 3" opacity="0.85" />
          <line x1="34" y1="96" x2="206" y2="96" stroke={line} strokeWidth="1" strokeDasharray="4 3" opacity="0.85" />
        </>
      )}
      {beach && <line x1="120" y1="42" x2="120" y2="118" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />}
      {!compact && (
        <g fill="white" fontSize="5" opacity="0.75">
          <text x="120" y="36" textAnchor="middle">{beach ? "Beach 16 x 8" : "Indoor 18 x 9"}</text>
          <text x="120" y="129" textAnchor="middle">{beach ? "No center line in play" : "Attack lines 3m from center"}</text>
        </g>
      )}
    </g>
  );
}

function renderScenario(scenario: Scenario) {
  const beach = scenario.startsWith("beach");
  if (scenario === "balls") {
    return (
      <g>
        <CourtBase compact />
        {[62, 92, 122, 152, 182].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={78 + (i % 2) * 18} r="11" fill="#f8fafc" stroke="#c8102e" strokeWidth="1.5" />
            <path d={`M ${x - 7} ${78 + (i % 2) * 18} q 7 -8 14 0`} fill="none" stroke="#c8102e" strokeWidth="1" />
          </g>
        ))}
        <Tag x={48} y={120} text="identical" />
        <Tag x={106} y={120} text="checked" />
        <Tag x={164} y={120} text="ready" />
      </g>
    );
  }

  if (scenario.includes("scoresheet")) {
    return (
      <g>
        <rect x="30" y="32" width="180" height="96" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="42" y="46" width="70" height="14" rx="2" fill="#fee2e2" />
        <rect x="128" y="46" width="58" height="14" rx="2" fill="#dbeafe" />
        {[70, 86, 102].map((y) => (
          <g key={y}>
            <line x1="42" y1={y} x2="190" y2={y} stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="50" cy={y - 5} r="3" fill={teamA} />
            <circle cx="181" cy={y - 5} r="3" fill={teamB} />
          </g>
        ))}
        <Arrow x1={64} y1={112} x2={104} y2={112} />
        <Arrow x1={136} y1={112} x2={176} y2={112} color="#2563eb" />
        <Tag x={52} y={136} text="record" />
        <Tag x={110} y={136} text="verify" />
        <Tag x={168} y={136} text="sign" />
      </g>
    );
  }

  if (scenario === "referee-crew" || scenario === "scorer-table") {
    return (
      <g>
        <CourtBase compact />
        <Player x={120} y={24} label="R1" color="#111827" />
        <Player x={120} y={136} label="R2" color="#111827" />
        <rect x="96" y="128" width="48" height="14" rx="4" fill="#ffffff" />
        <text x="120" y="137" textAnchor="middle" fill="#1a1a2e" fontSize="6" fontWeight="700">SCORER</text>
        <Player x={24} y={34} label="LJ" color="#f59e0b" />
        <Player x={216} y={126} label="LJ" color="#f59e0b" />
        <Arrow x1={120} y1={34} x2={120} y2={58} />
        <Arrow x1={120} y1={126} x2={120} y2={104} color="#2563eb" />
      </g>
    );
  }

  if (scenario.includes("tripleball")) {
    return (
      <g>
        <CourtBase compact />
        <Arrow x1={50} y1={124} x2={92} y2={92} />
        <Arrow x1={190} y1={124} x2={148} y2={92} color="#2563eb" />
        <Arrow x1={190} y1={34} x2={148} y2={68} color={green} />
        <Tag x={32} y={138} text="1 serve" />
        <Tag x={92} y={138} text="2 free" />
        <Tag x={152} y={138} text="3 free" />
      </g>
    );
  }

  if (scenario.includes("formation") || scenario.includes("reception")) {
    return (
      <g>
        <CourtBase compact />
        {[["1", 120, 104], ["2", 84, 80], ["3", 120, 56], ["4", 156, 80]].map(([label, x, y]) => (
          <Player key={label} x={Number(x)} y={Number(y)} label={String(label)} />
        ))}
        {scenario.includes("6v6") && [["5", 72, 102], ["6", 168, 102]].map(([label, x, y]) => (
          <Player key={label} x={Number(x)} y={Number(y)} label={String(label)} color={teamB} />
        ))}
        <Arrow x1={120} y1={104} x2={156} y2={80} />
        <Tag x={96} y={132} text="rotate roles" />
      </g>
    );
  }

  if (scenario === "substitution" || scenario === "interruptions" || scenario === "exceptional-interruptions") {
    return (
      <g>
        <CourtBase compact />
        <rect x="206" y="64" width="18" height="32" fill="#a855f7" opacity="0.45" />
        <rect x="92" y="132" width="56" height="14" rx="4" fill="#ffffff" />
        <text x="120" y="141" textAnchor="middle" fill="#1a1a2e" fontSize="6" fontWeight="700">SCORER</text>
        <Arrow x1={224} y1={126} x2={206} y2={94} color="#a855f7" />
        <Arrow x1={206} y1={68} x2={224} y2={40} color="#a855f7" />
        <Tag x={28} y={134} text="dead ball" />
        <Tag x={154} y={134} text="request" />
      </g>
    );
  }

  if (scenario.includes("libero")) {
    return (
      <g>
        <CourtBase compact />
        <rect x="12" y="80" width="22" height="38" fill="#facc15" opacity="0.45" />
        <Player x={72} y={104} label="L" color="#facc15" />
        <Player x={120} y={104} label="6" color={teamB} />
        <Arrow x1={72} y1={122} x2={34} y2={108} color="#facc15" />
        <Tag x={46} y={132} text="replace" />
        <Tag x={134} y={132} text="back row" />
      </g>
    );
  }

  if (scenario.startsWith("beach")) {
    return (
      <g>
        <CourtBase beach compact />
        <Player x={76} y={72} label="1" />
        <Player x={76} y={102} label="2" />
        <Player x={164} y={72} label="1" color={teamB} />
        <Player x={164} y={102} label="2" color={teamB} />
        <Arrow x1={76} y1={102} x2={164} y2={72} color={scenario === "beach-ball-handling" ? green : "#ff3d5a"} />
        <Tag x={40} y={132} text="2 players" />
        <Tag x={96} y={132} text="switch" />
        <Tag x={152} y={132} text="no subs" />
      </g>
    );
  }

  return (
    <g>
      <CourtBase compact />
      <Player x={60} y={104} label="S" />
      <Player x={92} y={56} label="A" />
      <Player x={148} y={56} label="B" color={teamB} />
      <Player x={180} y={104} label="R" color={teamB} />
      <Arrow x1={60} y1={104} x2={148} y2={56} />
      <Arrow x1={148} y1={56} x2={180} y2={104} color="#2563eb" />
      <Tag x={40} y={132} text="observe" />
      <Tag x={96} y={132} text="judge" />
      <Tag x={152} y={132} text="signal" />
    </g>
  );
}

export function ScenarioDiagram({ scenario, size = "lg" }: ScenarioDiagramProps) {
  const copy = scenarioCopy[scenario];
  const height = size === "lg" ? "h-80" : "h-64";

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-950 ${height}`}>
      <svg viewBox="0 0 240 170" className="h-full w-full">
        <defs>
          <linearGradient id={`scenario-bg-${scenario}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        <rect width="240" height="170" fill={`url(#scenario-bg-${scenario})`} />
        <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {renderScenario(scenario)}
        </motion.g>
        <rect x="12" y="8" width="216" height="26" rx="8" fill="#020617" opacity="0.82" />
        <text x="22" y="20" fill="white" fontSize="8" fontWeight="800">{copy.title}</text>
        <text x="22" y="29" fill="#cbd5e1" fontSize="5.2">{copy.subtitle}</text>
        <g>
          {copy.tags.slice(0, 3).map((tag, idx) => (
            <Tag key={tag} x={24 + idx * 62} y={148} text={tag} fill={idx === 0 ? "#fee2e2" : idx === 1 ? "#dbeafe" : "#dcfce7"} />
          ))}
        </g>
      </svg>
    </div>
  );
}
