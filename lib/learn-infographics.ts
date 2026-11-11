/** Teaching visuals follow the course's VC 2025–2026 / OVA source baseline. */
export type InfographicKind =
  | "court"
  | "zones"
  | "net"
  | "ball"
  | "uniforms"
  | "flow"
  | "scoring"
  | "rotation"
  | "overlap"
  | "boundary"
  | "contacts"
  | "crossing"
  | "centre-line"
  | "service"
  | "attack"
  | "block"
  | "substitution"
  | "delay"
  | "libero"
  | "sanctions"
  | "crew"
  | "flags"
  | "signals"
  | "sheet"
  | "formations"
  | "tripleball"
  | "reception"
  | "tosser"
  | "beach-contacts";

export interface LearnInfographic {
  title: string;
  kind: InfographicKind;
  caption: string;
  notes: string[];
}

export const learnInfographics: Record<string, LearnInfographic> = {
  "playing-area": {
    title: "The court, correctly mapped",
    kind: "court",
    caption:
      "Top view. The net spans the 9 m width, dividing the 18 m length into two square halves. Each team’s positions are numbered from its own perspective facing the net.",
    notes: [
      "Front row: 4 · 3 · 2. Back row: 5 · 6 · 1.",
      "Attack lines sit 3 m from the centre line. Free zone: at least 3 m on all sides.",
    ],
  },
  "zones-areas": {
    title: "Where each zone belongs",
    kind: "zones",
    caption:
      "Service zones sit beyond the end lines. The substitution zone lies between the attack-line extensions on the scorer’s side; libero replacement zones run from each attack line to its end line on that same side.",
    notes: [
      "Blue: back zone. Pale red: front zone. Green: service zone.",
      "Gold: libero replacement. Red: substitution. Scorer and benches are outside the free zone.",
    ],
  },
  "net-posts": {
    title: "Net and antenna measurements",
    kind: "net",
    caption:
      "Front elevation. Antennas mark the sides of the crossing space and extend 80 cm above the net. Posts stand outside the sidelines.",
    notes: [
      "Senior net: 2.43 m men / 2.24 m women. Net depth: 1 m.",
      "Posts: 0.50–1.00 m beyond each sideline. Youth net heights vary by age group.",
    ],
  },
  balls: {
    title: "Check the match ball",
    kind: "ball",
    caption:
      "Use balls with matching size, weight, pressure, model and colour throughout the match.",
    notes: [
      "Circumference: 65–67 cm. Weight: 260–280 g.",
      "Pressure: 0.30–0.325 kg/cm² (4.26–4.61 psi).",
    ],
  },
  teams: {
    title: "Uniform and roster checks",
    kind: "uniforms",
    caption:
      "The captain’s stripe sits below the chest number. The libero wears a clearly contrasting dominant colour; all participants must be registered.",
    notes: [
      "Jersey numbers: 1–99 in this VC course. Captain stripe: 8 × 2 cm.",
      "Match roster: up to 12 players; apply the course’s VC bench modification.",
    ],
  },
  "team-leaders": {
    title: "Who communicates with whom?",
    kind: "flow",
    caption:
      "The game captain seeks a rule explanation while the ball is out of play. The coach manages lineups, substitutions and timeouts.",
    notes: [
      "Game captain → referee → rule explanation",
      "Coach → lineup / substitution / timeout request",
    ],
  },
  scoring: {
    title: "A point on every rally",
    kind: "scoring",
    caption:
      "The rally winner gains one point. A receiving-team win also earns the next serve and a clockwise rotation.",
    notes: [
      "Regular set: 25 points. Deciding set: 15 points.",
      "Always win by two: 25–24 continues; 26–24 ends the set.",
    ],
  },
  "positions-rotation": {
    title: "Positions and clockwise rotation",
    kind: "rotation",
    caption:
      "One team, facing the net at the top. Arrows show the next position when the team gains the right to serve. Numbers are rotational positions, not jersey numbers or fixed tactical roles.",
    notes: [
      "Rotation: 1 → 6 → 5 → 4 → 3 → 2 → 1.",
      "Position 1 is back-right and supplies the server.",
    ],
  },
  "positional-rotational-faults": {
    title: "Overlap and wrong server are different",
    kind: "overlap",
    caption:
      "In this simplified foot-order example, back-row player 6 must be level with or behind front-row player 3 at service contact. Lateral relationships must also be maintained under the course’s VC positioning rules.",
    notes: [
      "Compare feet at the service hit, rather than a player’s torso.",
      "A rotational fault means the wrong player served; check the recorded service order.",
    ],
  },
  "states-of-play": {
    title: "A boundary line is part of the court",
    kind: "boundary",
    caption:
      "Top view of the ball’s floor contact. A ball touching any part of a boundary line is in. It is out when its floor contact is completely beyond the line.",
    notes: [
      "IN: any contact with the line.",
      "OUT: no contact with the line or court.",
    ],
  },
  "playing-ball": {
    title: "Three team contacts",
    kind: "contacts",
    caption:
      "An illustrative pass–set–attack sequence. These are common choices, not a requirement to use three contacts. An indoor block contact does not use a team hit.",
    notes: [
      "Maximum three team hits after an indoor block.",
      "The ball must rebound: it cannot be caught or thrown.",
    ],
  },
  "ball-at-net": {
    title: "The legal crossing space",
    kind: "crossing",
    caption:
      "Front view of the net. The ball crosses above the net and between the antennas. An antenna touch is out; external-space recovery has specific conditions under Rule 10.1.2.",
    notes: [
      "A ball may touch the net while crossing legally.",
      "The ball is out once it passes completely through the space under the net.",
    ],
  },
  "player-at-net": {
    title: "Feet at the centre line",
    kind: "centre-line",
    caption:
      "A foot may enter the opponent’s court if some part remains on or directly above the centre line and the player does not interfere. A foot completely beyond the line is a fault.",
    notes: [
      "Green: foot still overlaps the centre line. Red: foot entirely across.",
      "Touching the net between antennas during the action of playing the ball is a separate fault.",
    ],
  },
  service: {
    title: "Serve from behind the end line",
    kind: "service",
    caption:
      "At the service hit or jump-service takeoff, the server must be in the service zone and must not touch the end line or the court. Landing inside afterward is permitted.",
    notes: [
      "Whistle → one toss or release → service hit within 8 seconds.",
      "The service zone extends between the sideline extensions, behind the end line.",
    ],
  },
  "attack-hit": {
    title: "Back-row takeoff and landing",
    kind: "attack",
    caption:
      "Side view. For a back-row attack on a ball entirely above net height, take off without touching or crossing the attack line. Landing in the front zone is permitted.",
    notes: [
      "The takeoff, not the landing, determines this restriction.",
      "A back-row player cannot complete a front-zone attack on a ball entirely above the net.",
    ],
  },
  blocking: {
    title: "Indoor: a block plus three hits",
    kind: "block",
    caption:
      "Only front-row players may complete a block. An indoor block contact does not count as one of the team’s three hits; the blocker may make the next contact.",
    notes: [
      "Block → contact 1 → contact 2 → contact 3.",
      "Blocking an opponent’s serve is forbidden. A libero may not attempt a block.",
    ],
  },
  "regular-interruptions": {
    title: "Request during a dead ball",
    kind: "flow",
    caption:
      "A regular interruption is requested after the rally ends and before the next service whistle, following the applicable request procedure.",
    notes: [
      "Rally ends → authorized request → referee approval",
      "Per set: 2 timeouts and 6 substitutions. Timeout: 60 seconds under this VC course.",
    ],
  },
  "substitution-rules": {
    title: "A substitution keeps the same slot",
    kind: "substitution",
    caption:
      "Example under the limited-substitution rule: starter #7 leaves for substitute #12, then may return only for #12 in the same lineup position.",
    notes: [
      "Starter out once and back once per set; substitute enters once.",
      "Use the substitution zone between attack-line extensions on the scorer’s side.",
    ],
  },
  "game-delays": {
    title: "Delay sanctions belong to the team",
    kind: "delay",
    caption:
      "Delay signals show the card against the wrist. The first team delay in the match earns a warning; subsequent delays by that team earn a penalty.",
    notes: [
      "Yellow at wrist: delay warning, no point.",
      "Red at wrist: delay penalty, point and service to the opponent.",
    ],
  },
  "exceptional-interruptions": {
    title: "Stops, intervals and court changes",
    kind: "flow",
    caption:
      "Separate an interrupted rally from a normal interval. Serious injury or external interference can stop play and require a replay.",
    notes: [
      "Interrupted rally → resolve injury / interference → replay",
      "Between sets: 3-minute interval. Deciding set: change courts when the leader reaches 8.",
    ],
  },
  "libero-complete": {
    title: "The libero’s replacement path",
    kind: "libero",
    caption:
      "The libero replaces a back-row player through the bench-side zone between the attack line and end line. Only one libero may be on court.",
    notes: [
      "Unlimited replacements, separate from substitutions; normally a completed rally between replacements.",
      "An overhand finger set by the libero in the front zone restricts a teammate’s above-net attack.",
    ],
  },
  "libero-redesignation": {
    title: "Record a new libero",
    kind: "flow",
    caption:
      "When re-designation is permitted, choose an eligible player who is off court, excluding the regular replacement player. Notify R2 and record the change.",
    notes: [
      "Libero unavailable → eligible off-court player → R2 and scorer record",
      "The unavailable libero cannot return for the rest of the match; apply the course’s VC age modifications.",
    ],
  },
  sportsmanship: {
    title: "The clarification channel",
    kind: "flow",
    caption:
      "Respectful communication keeps play moving. While the ball is out, the game captain may ask the referee to explain a rule application.",
    notes: [
      "Player concern → game captain → referee explanation",
      "Accept decisions, respect opponents and officials, and manage bench conduct.",
    ],
  },
  "misconduct-sanctions": {
    title: "Read the cards correctly",
    kind: "sanctions",
    caption:
      "Card arrangement changes the consequence. Yellow is a formal warning. Red is a penalty. Joint red/yellow means expulsion; separated red/yellow means disqualification.",
    notes: [
      "Penalty: point and service to opponent. Expulsion: rest of the set.",
      "Disqualification: rest of the match. Serious misconduct can enter the scale directly.",
    ],
  },
  "refereeing-corps": {
    title: "Officials around the court",
    kind: "crew",
    caption:
      "Top view with a two-line-judge arrangement. R1 and R2 stand at opposite net posts. The scorer’s table sits outside the free zone, behind R2.",
    notes: [
      "R1: elevated stand, overall match authority. R2: floor level, requests and bench control.",
      "Line judges cover diagonally opposite corners; a four-judge system uses one near each corner.",
    ],
  },
  scorers: {
    title: "Two scorers, distinct records",
    kind: "flow",
    caption:
      "The scorer controls match and service records. The assistant scorer tracks libero replacements and supports the table’s records.",
    notes: [
      "Scorer → points / service order / requests",
      "Assistant scorer → libero tracking / scoreboard / support",
    ],
  },
  "line-judges": {
    title: "Five line-judge flag signals",
    kind: "flags",
    caption:
      "Use the flag position together with the described action. The waving signal covers antenna/crossing-space and service-foot faults, as applicable.",
    notes: [
      "Down = in. Up = out. Palm on flag top = touched.",
      "Wave = relevant fault. Cross forearms at chest = judgment impossible.",
    ],
  },
  "official-signals": {
    title: "Common referee hand signals",
    kind: "signals",
    caption:
      "Schematic gestures for six common signals. Direction and motion matter; consult the rulebook’s complete official signal sequence and diagrams for match practice.",
    notes: [
      "Timeout: T with hands. Substitution: circular forearms. Rotation fault: circular forefinger.",
      "Ball in: point down. Ball out: forearms vertical, palms inward. End of set: crossed forearms.",
    ],
  },
  "before-match": {
    title: "Prepare the match record",
    kind: "sheet",
    caption:
      "Teaching extract: verify match identity, player roster, captain designation and approvals before play. Use the official form for the complete required fields.",
    notes: [
      "Check event, date, venue, teams, player numbers and officials.",
      "Follow the VC-specific libero recording instructions for the competition.",
    ],
  },
  "after-toss": {
    title: "Transfer toss and lineup information",
    kind: "sheet",
    caption:
      "Teaching extract: team A begins on the scorer’s left and team B on the right. Transfer each team’s service/receive designation and lineup positions I–VI.",
    notes: [
      "Example: A serves (S), B receives (R). These are toss outcomes, not permanent team roles.",
      "Copy jersey numbers from the signed lineup; Roman numerals identify lineup slots.",
    ],
  },
  "recording-points": {
    title: "Follow one service turn",
    kind: "sheet",
    caption:
      "Teaching extract: slash points as earned, tick the service box when a player serves, and write that team’s running total when the service turn ends.",
    notes: [
      "Example: team A starts at 3, scores twice, then loses service at 5.",
      "The service-turn exit score is 5; it is not the number of points earned on that turn.",
    ],
  },
  "deciding-set": {
    title: "Record the court change at eight",
    kind: "sheet",
    caption:
      "Teaching extract: record points at change when the leading team reaches 8. Continue in the correct section of the official deciding-set sheet without resetting the score.",
    notes: [
      "At 8–6: change courts and preserve the 8–6 score.",
      "Play to 15, with at least a two-point lead.",
    ],
  },
  "substitutions-timeouts": {
    title: "Record who changed and at what score",
    kind: "sheet",
    caption:
      "Teaching extract: place the incoming player below the outgoing player and record the score at the change. Timeout boxes also record the score at the request.",
    notes: [
      "Example substitution: #7 out, #12 in at 10–8.",
      "Write the requesting team’s score first in its timeout box.",
    ],
  },
  "sanctions-recording": {
    title: "Record the sanction and context",
    kind: "sheet",
    caption:
      "Teaching extract: use the W, P, E or D column, identify the participant or team, and record the set and score. The example shows a penalty to #7 of team A in set 2 at 10–8.",
    notes: [
      "W = warning · P = penalty · E = expulsion · D = disqualification.",
      "Penalty points must also be entered and identified in the opponent’s point record.",
    ],
  },
  "after-match": {
    title: "Close and verify the sheet",
    kind: "sheet",
    caption:
      "Teaching extract: complete set results and duration, verify match totals, then obtain the required signatures in the prescribed order.",
    notes: [
      "Results → totals → verification → signatures.",
      "Check the winning team and final set count against the completed set records.",
    ],
  },
  "4v4-court-equipment": {
    title: "A smaller court for four",
    kind: "court",
    caption:
      "OVA course baseline: 14 × 7 m court, divided into 7 × 7 m halves. Four players per team; no libero. Player dots are an illustrative formation, not numbered indoor positions.",
    notes: [
      "Net: 2.15 m girls / 2.20 m boys and co-ed.",
      "Use the course’s specified development ball and seasonal competition rules.",
    ],
  },
  "4v4-teams-formations": {
    title: "Diamond and square formations",
    kind: "formations",
    caption:
      "Two possible four-player shapes, each facing the net at the top. F and B identify front-row and back-row roles; the designated setter must be in the front row.",
    notes: [
      "Diamond: one front, two side, one back. Square: two front, two back.",
      "Illustrative spacing only; all players participate and rotate roles.",
    ],
  },
  "4v4-tripleball": {
    title: "One sequence, three rallies",
    kind: "tripleball",
    caption:
      "Team A is the serving team for this example. Each rally awards a point. Complete all three rallies before the prescribed rotational player exchange.",
    notes: [
      "1. A serves → B. 2. Free ball to B. 3. Free ball to A.",
      "The served player stays for both free balls, then rotates out under the 4v4 procedure.",
    ],
  },
  "4v4-playing-regulations": {
    title: "Serve reception versus tossed-ball reception",
    kind: "reception",
    caption:
      "Both receptions use a forearm pass in this OVA course. The consequence of an overhand reception depends on whether the ball was served or introduced by the tosser.",
    notes: [
      "Overhand serve receive: fault and point to opponent.",
      "Overhand reception of the introduced free ball: re-toss.",
    ],
  },
  "6v6-court-equipment": {
    title: "Full court, six players",
    kind: "court",
    caption:
      "OVA 6v6 Rallyball uses an 18 × 9 m court. The front row is 4–3–2 and the back row is 5–6–1 from each team’s own perspective facing the net.",
    notes: [
      "Net: 2.15 m female / 2.20 m male under this course.",
      "Six players per side. No libero.",
    ],
  },
  "6v6-tripleball-service": {
    title: "Tripleball and the next serve",
    kind: "tripleball",
    caption:
      "Team A serves this sequence: a served rally, a free ball to B, then a free ball to A. Service passes to the other team after the sequence.",
    notes: [
      "A designated setter may originate from position 1, 2 or 3; declare that position for the set.",
      "Substitutions occur between sequences, not between their individual rallies.",
    ],
  },
  "6v6-serving-reception": {
    title: "Keep the reception configuration",
    kind: "rotation",
    caption:
      "A neutral six-player reception example, facing the net. Position numbers describe rotational order. A designated setter is a separately declared role and is not permanently attached to one universal court position.",
    notes: [
      "Use the same reception configuration for the whole set under this OVA course.",
      "Do not switch until the ball returns to your side; overhand serve reception is a fault.",
    ],
  },
  "6v6-free-ball-tosser": {
    title: "One consistent free-ball target",
    kind: "tosser",
    caption:
      "Half-court top view. The tosser introduces the ball to their own team, consistently toward position 5 or 6. The front row starts at the net, ready for the cue.",
    notes: [
      "Two-hand underhand toss, above antenna height, with little or no spin.",
      "Choose a consistent target; the illustration shows alternatives, not two simultaneous tosses.",
    ],
  },
  "beach-court-equipment": {
    title: "The beach court",
    kind: "court",
    caption:
      "A 16 × 8 m sand court with two 8 × 8 m halves. The net spans the 8 m width. There is no painted centre line and no attack line.",
    notes: [
      "Senior net: 2.43 m men / 2.24 m women. Two players on each side.",
      "Free zone: at least 3 m. FIVB sand depth: at least 40 cm.",
    ],
  },
  "beach-teams-uniforms": {
    title: "One team, two players",
    kind: "uniforms",
    caption:
      "Beach teams contain exactly two players, numbered 1 and 2. One is designated captain. There are no player substitutions.",
    notes: [
      "Players normally compete barefoot.",
      "The captain may request clarification while the ball is out of play.",
    ],
  },
  "beach-scoring-format": {
    title: "Beach targets and court switches",
    kind: "scoring",
    caption:
      "A beach match is best of three sets: the first two to 21 and the deciding third to 15. Every set requires a two-point margin.",
    notes: [
      "Switch after every 7 combined points in sets 1–2, every 5 in set 3.",
      "Example: 4–3 totals 7, so change courts. Maintain service order.",
    ],
  },
  "beach-ball-handling": {
    title: "Beach: the block is contact one",
    kind: "beach-contacts",
    caption:
      "Unlike indoor volleyball, a beach block contact counts toward the team’s three hits. Only two contacts remain after it.",
    notes: [
      "Block = 1 → contact 2 → contact 3 → return.",
      "No open-hand fingertip tips. An intentional overhand set across must follow the shoulder-line restriction.",
    ],
  },
  "beach-service-attack": {
    title: "Service sight line and free attack positions",
    kind: "service",
    caption:
      "Top view. The server is behind the end line and the partner must not screen the receiver’s view of the server and ball flight. The net position shown is not a centre line on the sand.",
    notes: [
      "Both players may attack from anywhere; there are no positional-order faults.",
      "Maintain service order. Blocking an opponent’s service is forbidden.",
    ],
  },
  "beach-interruptions-conduct": {
    title: "Beach interruption checklist",
    kind: "flow",
    caption:
      "Beach has one timeout per team per set and no substitutions. Apply the official misconduct scale and the appropriate court-switch schedule.",
    notes: [
      "One timeout → 30 seconds → resume play",
      "Switch every 7 combined points, or every 5 in the deciding set.",
    ],
  },
};

export function infographicPath(lessonId: string) {
  return `/images/learn/${lessonId}.svg`;
}
