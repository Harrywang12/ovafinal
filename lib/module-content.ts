// Comprehensive module content based on Volleyball Canada 2025-2026 Official Volleyball Rules
// Each module corresponds to a chapter from the official FIVB rulebook

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  keyPoints: string[];
  ruleRef: string;
  diagram: string;
  vcNote?: string; // Volleyball Canada specific modifications
  image?: string;
}

export interface Module {
  id: string;
  chapter: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorClass: string;
  heroImage: string;
  estimatedTime: string;
  ruleRange: string;
  category: "indoor" | "rallyball-4v4" | "rallyball-6v6" | "beach";
  chapterLabel?: string; // Optional override for display (e.g., "4v4" instead of "Ch. 1")
  lessons: Lesson[];
  nextModule?: string;
}

export const moduleContent: Record<string, Module> = {
  facilities: {
    id: "facilities",
    chapter: 1,
    title: "Facilities & Equipment",
    description: "Learn the official court dimensions, net specifications, zones, and ball standards that define the playing environment.",
    icon: "📐",
    color: "#3b82f6",
    colorClass: "bg-blue-500",
    heroImage: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&q=80",
    estimatedTime: "12 min",
    category: "indoor",
    ruleRange: "Rules 1-3",
    nextModule: "participants",
    lessons: [
      {
        id: "playing-area",
        title: "Playing Area",
        subtitle: "Court dimensions, surfaces, and lines",
        content: [
          "The playing court is a rectangle measuring 18 x 9 meters, surrounded by a free zone which is a minimum of 3 meters wide on all sides. The playing area includes both the playing court and the free zone.",
          "The free playing space is the space above the playing area which is free from any obstructions. It shall measure a minimum of 7 meters in height from the playing surface. For Volleyball Canada Championships and Canada Games, a minimum of 9 meters is required.",
          "The surface must be flat, horizontal, and uniform. It must not present any danger of injury to players. On indoor courts, the surface must be of a light colour. All lines are 5 cm wide and must be of a light colour different from the floor.",
          "Two sidelines and two end lines mark the playing court. Both sidelines and end lines are drawn inside the dimensions of the playing court. The centre line divides the playing court into two equal courts of 9 x 9 meters each.",
          "The attack line is drawn 3 meters back from the axis of the centre line. The rear edge of this line marks the front zone on each court."
        ],
        keyPoints: [
          "Court: 18m x 9m (each half 9m x 9m)",
          "Free zone: minimum 3m on all sides",
          "Free playing space: minimum 7m height (9m for nationals)",
          "All lines: 5cm wide, light colour",
          "Attack line: 3m from centre line"
        ],
        ruleRef: "Rules 1.1-1.3",
        vcNote: "For Canada Games, free playing space must be minimum 9 meters high.",
        diagram: "court-layout",
        image: "https://images.unsplash.com/photo-1592656094267-764a45160876?w=800&q=80"
      },
      {
        id: "zones-areas",
        title: "Zones & Areas",
        subtitle: "Front zone, service zone, substitution zone, and libero replacement zone",
        content: [
          "The FRONT ZONE is limited by the axis of the centre line and the rear edge of the attack line. It extends beyond the sidelines to the end of the free zone. Back-row players have attack restrictions in this zone.",
          "The SERVICE ZONE is a 9-meter wide area behind each end line. It is laterally limited by two short lines (15 cm long) drawn 20 cm behind the end line as extensions of the sidelines. In depth, it extends to the end of the free zone.",
          "The SUBSTITUTION ZONE is limited by the extension of both attack lines up to the scorer's table. This is where all regular player substitutions take place.",
          "The LIBERO REPLACEMENT ZONE is part of the free zone on the side of the team benches, limited by the extension of the attack line up to the end line. Liberos enter and exit only through this zone.",
          "WARM-UP AREAS are approximately 3 x 3 meters, located in both bench-side corners outside the free zone. The minimum temperature shall not be below 10°C (50°F). Lighting should be 1000 to 1500 lux."
        ],
        keyPoints: [
          "Front zone: between attack line and net",
          "Service zone: 9m wide behind end line",
          "Substitution zone: between attack lines at scorer's table",
          "Libero replacement zone: bench side, attack line to end line",
          "Temperature: minimum 10°C (50°F)"
        ],
        ruleRef: "Rules 1.4-1.6",
        diagram: "court-layout"
      },
      {
        id: "net-posts",
        title: "Net & Posts",
        subtitle: "Net height, structure, antennas, and measurements",
        content: [
          "The net is placed vertically over the centre line. The top is set at 2.43 meters for men and 2.24 meters for women. The height is measured from the centre of the playing court and must be exactly the same over the two sidelines (not exceeding official height by more than 2 cm).",
          "The net is 1 meter wide and 9.50 to 10 meters long, made of 10 cm square black mesh. A horizontal band (7 cm wide) of white canvas is sewn along the top. A flexible cable keeps the top taut.",
          "Two white SIDE BANDS are fastened vertically to the net directly above each sideline. They are 5 cm wide and 1 meter long, considered part of the net.",
          "ANTENNAS are flexible rods 1.80 meters long and 10 mm in diameter, made of fiberglass. They are fastened at the outer edge of each side band. The top 80 cm extends above the net with 10 cm stripes of red and white.",
          "The POSTS supporting the net are placed 0.50 to 1.00 meters outside the sidelines. They are 2.55 meters high, rounded and smooth, fixed to the ground without wires."
        ],
        keyPoints: [
          "Net height: 2.43m (men), 2.24m (women)",
          "Youth heights: 15/16U men 2.35m, 14U 2.20m, etc.",
          "Net width: 1m, length: 9.50-10m",
          "Antennas: 1.80m long, top 80cm above net",
          "Posts: 2.55m high, 0.5-1m from sideline"
        ],
        ruleRef: "Rules 2.1-2.5",
        vcNote: "Youth heights: 15/16U men 2.35m, 15U women 2.20m, 16U women 2.24m, 14U men 2.20m, 14U women 2.15m",
        diagram: "net-design",
        image: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&q=80"
      },
      {
        id: "balls",
        title: "Balls",
        subtitle: "Official ball specifications and standards",
        content: [
          "The ball shall be spherical, made of a flexible leather or synthetic leather case with a bladder inside made of rubber or similar material. Its colour may be uniform light colour or a combination of colours.",
          "The circumference is 65-67 cm and weight is 260-280 grams. The inside pressure shall be 0.30 to 0.325 kg/cm² (4.26 to 4.61 psi or 294.3 to 318.82 mbar).",
          "All balls used in a match must have the same standards regarding circumference, weight, pressure, type, colour, etc. This ensures consistency throughout the match.",
          "Where possible, five balls shall be used with six ball retrievers stationed at corners of the free zone and behind each referee. A three-ball system is recommended to speed up the game.",
          "For Volleyball Canada Championships: 14U-16U uses Mikasa VQ200w-CAN, 17U-18U uses Mikasa V200w."
        ],
        keyPoints: [
          "Circumference: 65-67 cm",
          "Weight: 260-280 grams",
          "Pressure: 0.30-0.325 kg/cm² (4.26-4.61 psi)",
          "All match balls must be identical",
          "5-ball or 3-ball system recommended"
        ],
        ruleRef: "Rules 3.1-3.3",
        vcNote: "VC Championships: 14U-16U Mikasa VQ200w-CAN, 17U-18U Mikasa V200w",
        diagram: "court-layout"
      }
    ]
  },
  participants: {
    id: "participants",
    chapter: 2,
    title: "Participants",
    description: "Understand team composition, equipment requirements, and the roles of captains and coaches.",
    icon: "👥",
    color: "#8b5cf6",
    colorClass: "bg-purple-500",
    heroImage: "https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=1200&q=80",
    estimatedTime: "10 min",
    category: "indoor",
    ruleRange: "Rules 4-5",
    nextModule: "format",
    lessons: [
      {
        id: "teams",
        title: "Teams",
        subtitle: "Team composition, location, and equipment",
        content: [
          "A team may consist of up to 12 players, plus coaching staff (one coach, maximum two assistant coaches) and medical staff (one team therapist and one medical doctor). Only those on the score sheet may enter the Competition Control Area.",
          "Players not in play should sit on their team bench or be in the warm-up area. The benches are located beside the scorer's table, outside the free zone. During set intervals, players may warm-up with balls in their own free zone.",
          "Equipment consists of a jersey and shorts/leggings. The colour and design must be uniform for the team (except Libero). Jerseys must be numbered from 1 to 99 - minimum 10 cm height on front, 15 cm on back, stripe minimum 2 cm wide.",
          "The team captain must have a stripe of 8 x 2 cm underlining the number on the chest. Shoes must be light and pliable with rubber or composite soles without heels.",
          "FORBIDDEN OBJECTS: Items that may cause injury or give artificial advantage. No hard plastic, metal, or wood guards/braces on hands/arms. Headwear prohibited except for medical/religious reasons. Glasses/lenses worn at player's own risk."
        ],
        keyPoints: [
          "Maximum 12 players + coaches + medical staff",
          "Jerseys numbered 1-99, uniform design",
          "Captain has 8x2 cm stripe under front number",
          "No dangerous objects or hard braces",
          "Glasses/lenses at player's own risk"
        ],
        ruleRef: "Rules 4.1-4.5",
        vcNote: "VC allows up to 15 players on bench but only 12 on score sheet per match",
        diagram: "referee-positions",
        image: "https://images.unsplash.com/photo-1553005746-9245ba190489?w=800&q=80"
      },
      {
        id: "team-leaders",
        title: "Team Leaders",
        subtitle: "Captain and coach responsibilities",
        content: [
          "Both the team captain and coach are responsible for the conduct and discipline of their team members. The Libero can be either the team or game captain.",
          "PRIOR TO THE MATCH: The captain represents the team in the toss, then signs the score sheet. The coach records or checks names and numbers on the scoresheet team roster.",
          "DURING THE MATCH: When the captain is on court, they are the game captain. If not, another player must be assigned this role. Only the game captain may speak to referees when the ball is out of play.",
          "The game captain may: (1) Ask for explanation of rule application/interpretation, (2) Request authorization to change equipment, verify positions, or check floor/net/ball, (3) Request timeouts and substitutions if coach is absent.",
          "The COACH sits on the bench but may leave it. They select starting line-ups, request substitutes and timeouts. They may give instructions while standing/walking in the free zone from the attack line extension to the warm-up area."
        ],
        keyPoints: [
          "Captain signs score sheet and represents team at toss",
          "Game captain = only one who can speak to referees",
          "Captain stripe: 8 x 2 cm under front number",
          "Coach selects lineup, requests subs and timeouts",
          "Coach can walk in free zone to give instructions"
        ],
        ruleRef: "Rules 5.1-5.3",
        vcNote: "For 18U and younger, head coach must sign score sheet at match completion",
        diagram: "referee-positions"
      }
    ]
  },
  format: {
    id: "format",
    chapter: 3,
    title: "Playing Format",
    description: "Master scoring rules, set structure, player positions, and the rotation system.",
    icon: "🏆",
    color: "#22c55e",
    colorClass: "bg-green-500",
    heroImage: "https://images.unsplash.com/photo-1580692475446-c2fabbbbf835?w=1200&q=80",
    estimatedTime: "15 min",
    category: "indoor",
    ruleRange: "Rules 6-7",
    nextModule: "actions",
    lessons: [
      {
        id: "scoring",
        title: "Scoring System",
        subtitle: "Rally point system, sets, and match format",
        content: [
          "A team scores a point by: (1) successfully landing the ball on the opponent's court, (2) when the opponent commits a fault, or (3) when the opponent receives a penalty.",
          "A FAULT is a playing action contrary to the rules. If two faults are committed successively, only the first one counts. If two faults are committed simultaneously by opponents, it's a DOUBLE FAULT and the rally is replayed.",
          "If the serving team wins the rally, they score a point and continue to serve. If the receiving team wins the rally, they score a point AND gain the right to serve (side-out).",
          "A SET is won by the team that first scores 25 points with a minimum lead of 2 points. In case of 24-24, play continues until a 2-point lead is achieved (26-24, 27-25, etc.). There is no point cap.",
          "The MATCH is won by the team that wins 2 of 3 sets (or 3 of 5 sets). The deciding set (3rd or 5th) is played to 15 points with a minimum 2-point lead. A team that refuses to play or doesn't appear forfeits 0-3 (0-25 each set)."
        ],
        keyPoints: [
          "Rally point system: every rally = a point",
          "Set won at 25 points with 2-point lead",
          "Deciding set to 15 points, 2-point lead",
          "Match: best 2 of 3 or 3 of 5 sets",
          "Double fault = replay the rally"
        ],
        ruleRef: "Rules 6.1-6.4",
        diagram: "court-layout",
        image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80"
      },
      {
        id: "positions-rotation",
        title: "Positions & Rotation",
        subtitle: "The six positions and rotation order",
        content: [
          "At the moment the ball is hit by the server, each team must be positioned within its own court in rotational order. The positions are numbered 1-6: Front row = 4 (left), 3 (centre), 2 (right); Back row = 5 (left), 6 (centre), 1 (right/server).",
          "RELATIVE POSITIONS: Each back-row player must be positioned further from the centre line than the corresponding front-row player (1 behind 2, 6 behind 3, 5 behind 4). Side players must be positioned in correct left/right order.",
          "Positions are determined by the players' FEET contacting the ground. Each back-row player must have at least part of one foot further from the centre line than the front foot of the corresponding front-row player.",
          "AFTER THE SERVICE HIT, players may move around and occupy any position on their court and the free zone. There are no positional requirements after the serve - only attack and blocking restrictions for back-row players apply.",
          "When the receiving team wins the rally and gains the right to serve, its players ROTATE ONE POSITION CLOCKWISE: Position 2 → 1 (to serve), 1 → 6, 6 → 5, 5 → 4, 4 → 3, 3 → 2."
        ],
        keyPoints: [
          "Positions: 1-6 (1=server, 2-4 front row, 5-6 back row)",
          "Correct positions only required at serve contact",
          "Compare feet positions for overlaps",
          "Free to move after serve is contacted",
          "Rotate clockwise when gaining serve"
        ],
        ruleRef: "Rules 7.4-7.6",
        diagram: "player-positions"
      },
      {
        id: "positional-rotational-faults",
        title: "Positional & Rotational Faults",
        subtitle: "What happens when positions are wrong",
        content: [
          "A POSITIONAL FAULT is committed if any player is not in their correct position at the moment the ball is hit by the server. The team is sanctioned with a point and service to the opponent.",
          "If the server commits a serving fault at the moment of the service hit AND the opponent is out of position, the server's fault is counted first (before the positional fault).",
          "If the service is correct but becomes faulty after the hit (goes out, etc.), the positional fault that occurred first will be sanctioned instead.",
          "A ROTATIONAL FAULT is committed when the service is not made according to the rotational order. The scorer should stop play immediately. The opponent gains a point and service.",
          "When a rotational fault is discovered, ALL POINTS scored by the faulty team since the fault was committed are cancelled. The opponent's points remain valid. If the moment cannot be determined, no point cancellation occurs."
        ],
        keyPoints: [
          "Positional fault = loss of rally",
          "Service fault before positional fault if both occur",
          "Rotational fault = wrong server",
          "Points cancelled back to moment of rotation fault",
          "Players must correct positions immediately"
        ],
        ruleRef: "Rules 7.5-7.7",
        diagram: "player-positions"
      }
    ]
  },
  actions: {
    id: "actions",
    chapter: 4,
    title: "Playing Actions",
    description: "Learn ball handling rules, net play, service, attack hits, and blocking regulations.",
    icon: "⚡",
    color: "#f59e0b",
    colorClass: "bg-amber-500",
    heroImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    estimatedTime: "25 min",
    category: "indoor",
    ruleRange: "Rules 8-14",
    nextModule: "interruptions",
    lessons: [
      {
        id: "states-of-play",
        title: "States of Play",
        subtitle: "Ball IN, OUT, in play, and out of play",
        content: [
          "The ball is IN PLAY from the moment of the service hit authorized by the first referee. The ball is OUT OF PLAY at the moment a fault is whistled, or in absence of a fault, at the moment of the whistle.",
          "The ball is 'IN' if at any moment of its contact with the floor, some part of the ball touches the court INCLUDING the boundary lines. Lines are part of the court.",
          "The ball is 'OUT' when: (1) All parts touching the floor are completely outside the boundary lines, (2) It touches an object outside the court, ceiling, or person out of play, (3) It touches the antenna, ropes, posts, or net outside the side bands.",
          "The ball is also 'OUT' when it crosses the vertical plane of the net either partially or totally outside the crossing space (except Rule 10.1.2), or when it crosses completely through the lower space under the net.",
          "Each team must play within its own playing area and space. The ball may be retrieved from beyond the free zone and over the scoring table in its complete extension."
        ],
        keyPoints: [
          "Ball in play: from service hit to whistle",
          "Lines are IN (part of the court)",
          "OUT: completely outside lines, touches antenna/post",
          "OUT: crosses net outside antennas",
          "OUT: completely under net"
        ],
        ruleRef: "Rules 8.1-8.4",
        diagram: "ball-crossing",
        image: "https://images.unsplash.com/photo-1594470117722-de4b9a02ebed?w=800&q=80"
      },
      {
        id: "playing-ball",
        title: "Playing the Ball",
        subtitle: "Hits, contacts, and ball handling faults",
        content: [
          "A hit is any contact with the ball by a player in play. The team is entitled to a maximum of THREE HITS (in addition to blocking) for returning the ball. More than three = FOUR HITS fault.",
          "A player may not hit the ball twice consecutively (CONSECUTIVE CONTACTS) except during blocking or first team contact. Two or three teammates may touch the ball simultaneously - this counts as two or three hits.",
          "When two opponents touch the ball simultaneously over the net and the ball remains in play, the receiving team gets another three hits. If simultaneous hits lead to extended contact over the net, play continues.",
          "The ball may touch any part of the body. The ball must NOT be caught or thrown - it must rebound from the hit. The ball may touch various parts of the body if the contacts are SIMULTANEOUS.",
          "At the FIRST HIT of the team (receive, dig, block touch), the ball may contact various parts of the body consecutively, provided the contacts occur during one action. This allows more latitude for difficult defensive plays."
        ],
        keyPoints: [
          "Maximum 3 team hits (block doesn't count)",
          "Ball can touch any body part",
          "No catch/throw - must rebound",
          "First contact allows consecutive body parts",
          "Simultaneous team contact = multiple hits"
        ],
        ruleRef: "Rules 9.1-9.3",
        diagram: "court-layout"
      },
      {
        id: "ball-at-net",
        title: "Ball at the Net",
        subtitle: "Crossing space, touching net, ball in net",
        content: [
          "The ball sent to the opponent's court must go over the net within the CROSSING SPACE. This space is limited by: (1) Below by the top of the net, (2) At sides by the antennas and their imaginary extension, (3) Above by the ceiling.",
          "A ball from the first hit that crosses the net plane to the opponent's free zone through the external space may be played back, provided: (1) opponent's court is not touched, (2) ball crosses back through external space on the same side.",
          "A ball heading toward the opponent's court through the LOWER SPACE is in play until it has completely crossed the vertical plane of the net. It becomes OUT only when fully through.",
          "While crossing the net, the ball MAY TOUCH IT. This is legal - there is no fault for a ball touching the net.",
          "A ball driven into the net may be recovered within the three team hits. If the ball rips the mesh or tears down the net, the rally is cancelled and replayed."
        ],
        keyPoints: [
          "Crossing space: between antennas, above net",
          "Ball may touch net while crossing (legal)",
          "First hit through external space can be recovered",
          "Ball under net = out only when fully through",
          "Ball rips net = replay rally"
        ],
        ruleRef: "Rules 10.1-10.3",
        diagram: "ball-crossing"
      },
      {
        id: "player-at-net",
        title: "Player at the Net",
        subtitle: "Reaching beyond, penetration, and net contact",
        content: [
          "In BLOCKING, a player may touch the ball beyond the net if they don't interfere with the opponent's play BEFORE their attack hit. After an attack hit, a player may pass their hand beyond the net if the initial contact was in their own space.",
          "PENETRATION UNDER THE NET is permitted if it does not interfere with opponent's play. Touching the opponent's court with a foot is allowed if part of the foot remains on or directly above the centre line.",
          "Touching opponent's court with any body part ABOVE THE FEET is permitted if it doesn't interfere with play. A player may enter the opponent's court after the ball goes out of play.",
          "NET CONTACT by a player between the antennas during the action of playing the ball IS A FAULT. The action includes take-off, hit (or attempt), and landing safely.",
          "Players may touch the post, ropes, or net itself OUTSIDE THE ANTENNAS without penalty, provided it doesn't interfere with play. When the ball is driven into the net causing it to touch an opponent, no fault is committed."
        ],
        keyPoints: [
          "Can reach over after opponent's attack hit",
          "Foot penetration OK if part stays on/above centre line",
          "Complete foot over centre line = fault",
          "Net touch during playing action = fault",
          "Outside antennas = no net fault"
        ],
        ruleRef: "Rules 11.1-11.4",
        diagram: "ball-crossing",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
      },
      {
        id: "service",
        title: "Service",
        subtitle: "Execution, timing, screening, and faults",
        content: [
          "The service is the act of putting the ball into play by the back-right player (position 1) from the service zone. The first service of sets 1 and deciding set is determined by toss. Other sets: team that didn't serve first in previous set.",
          "EXECUTION: The ball shall be hit with one hand or any part of the arm after being tossed or released. Only ONE TOSS is allowed - dribbling or moving the ball in hands is permitted before the toss.",
          "At the moment of contact or take-off for a jump serve, the server must not touch the court (including end line) or ground outside the service zone. After the hit, they may step inside the court.",
          "The server must hit the ball WITHIN 8 SECONDS after the referee whistles for service. A service before the whistle is cancelled and repeated. The first referee authorizes service after checking both teams are ready.",
          "SCREENING: Players must not prevent opponents from seeing the service hit or ball flight path. Waving arms, jumping, moving sideways, or standing grouped to hide the serve is a fault. Raising hands above the head during service is forbidden until ball passes the net."
        ],
        keyPoints: [
          "8 seconds to serve after whistle",
          "Only ONE toss allowed",
          "Can't touch end line at contact",
          "Let serves (ball touches net) are legal",
          "Screening = hiding serve from opponents"
        ],
        ruleRef: "Rules 12.1-12.7",
        vcNote: "All Volleyball Canada time-outs last 60 seconds (not 30)",
        diagram: "court-layout"
      },
      {
        id: "attack-hit",
        title: "Attack Hit",
        subtitle: "Characteristics, restrictions, and faults",
        content: [
          "All actions directing the ball toward opponents (except service and block) are ATTACK HITS. An attack hit is completed when the ball completely crosses the vertical plane of the net or is touched by an opponent.",
          "A FRONT-ROW PLAYER may complete an attack hit at any height, provided contact is within their own playing space. They have no restrictions on attacking.",
          "A BACK-ROW PLAYER may complete an attack hit at any height from BEHIND THE FRONT ZONE. At take-off, their foot must not have touched or crossed the attack line. After the hit, they may land in the front zone.",
          "A back-row player may attack from the front zone ONLY if at the moment of contact, part of the ball is LOWER than the top of the net. This is the key back-row attack rule.",
          "NO PLAYER may attack the OPPONENT'S SERVICE when the ball is in the front zone and entirely higher than the top of the net. Attacking a serve this way is a fault. During tipping, the ball must be cleanly hit, not caught or thrown."
        ],
        keyPoints: [
          "Front row: can attack from anywhere at any height",
          "Back row: take-off must be behind attack line",
          "Back row in front zone: only if ball below net height",
          "Cannot attack a serve above net height",
          "Tip must be clean hit, not caught"
        ],
        ruleRef: "Rules 13.1-13.3",
        diagram: "back-row-attack",
        image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80"
      },
      {
        id: "blocking",
        title: "Block",
        subtitle: "Blocking rules, contacts, and restrictions",
        content: [
          "BLOCKING is the action of intercepting the ball from the opponent by reaching HIGHER THAN THE TOP OF THE NET. Only FRONT-ROW PLAYERS can complete a block. At contact, part of the body must be higher than the net.",
          "A BLOCK ATTEMPT is blocking without touching the ball. A COMPLETED BLOCK is when the ball is touched by a blocker. A collective block involves 2-3 players close together.",
          "BLOCK CONTACT is NOT counted as a team hit. After a block contact, the team gets THREE MORE HITS. The first hit after the block may be by any player, including the blocker.",
          "Consecutive contacts with the ball may occur by one or more blockers during one action. The blocker may place hands beyond the net if it doesn't interfere with the opponent BEFORE their attack hit.",
          "BLOCKING THE SERVICE IS FORBIDDEN. This is always a fault. A back-row player or Libero completing a block or participating in a completed block is a fault."
        ],
        keyPoints: [
          "Only front-row players can block",
          "Block contact ≠ team hit (3 more allowed)",
          "Can reach over after opponent's attack",
          "NEVER block a serve",
          "Back-row/Libero blocking = fault"
        ],
        ruleRef: "Rules 14.1-14.6",
        diagram: "completed-block"
      }
    ]
  },
  interruptions: {
    id: "interruptions",
    chapter: 5,
    title: "Interruptions & Delays",
    description: "Learn timeout and substitution procedures, delay sanctions, and interval rules.",
    icon: "⏱️",
    color: "#6366f1",
    colorClass: "bg-indigo-500",
    heroImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
    estimatedTime: "15 min",
    category: "indoor",
    ruleRange: "Rules 15-18",
    nextModule: "libero",
    lessons: [
      {
        id: "regular-interruptions",
        title: "Regular Interruptions",
        subtitle: "Timeouts and substitution limits",
        content: [
          "An INTERRUPTION is the time between one completed rally and the referee's whistle for the next service. The only regular game interruptions are TIMEOUTS and SUBSTITUTIONS.",
          "Each team may request a maximum of TWO TIMEOUTS and SIX SUBSTITUTIONS per set. Timeouts last 30 seconds (60 seconds for Volleyball Canada competitions).",
          "Requests for one or two timeouts and one substitution request may follow one another in the same interruption. However, a team cannot make consecutive substitution requests - there must be a completed rally between them.",
          "Two or more players may be substituted at the same time within the SAME REQUEST. If multiple subs, all substitute players must enter the substitution zone together.",
          "Regular interruptions may only be requested by the coach (or game captain if coach absent) when the ball is out of play and before the whistle for service."
        ],
        keyPoints: [
          "Maximum 2 timeouts per set",
          "Maximum 6 substitutions per set",
          "Timeouts: 30 seconds (60 for VC)",
          "No consecutive sub requests without a rally",
          "Request when ball is out of play"
        ],
        ruleRef: "Rules 15.1-15.4",
        vcNote: "All VC timeouts last 60 seconds. 14U-15U allows 12 substitutions per set.",
        diagram: "referee-positions"
      },
      {
        id: "substitution-rules",
        title: "Substitution Rules",
        subtitle: "Limited vs unlimited substitutions, exceptional subs",
        content: [
          "LIMITED SUBSTITUTION: A starter may leave once and re-enter once per set, only to their previous position. A substitute may enter once per set and can only be replaced by the same starter.",
          "UNLIMITED SUBSTITUTION: A starter may leave and re-enter multiple times per set, only to their previous position. A substitute may enter multiple times but only for the same starter.",
          "EXCEPTIONAL SUBSTITUTION: If a player cannot continue due to injury/illness/expulsion and no legal sub is possible, any player not on court (except Libero or their replacement player) may substitute in. The injured player cannot re-enter the match.",
          "ILLEGAL SUBSTITUTION: Exceeds limits or involves unregistered player. Penalty: point and service to opponent, substitution rectified, team's points since the fault are cancelled.",
          "Substitutions must occur in the SUBSTITUTION ZONE. The request starts when substitute players enter the zone ready to play. The coach doesn't need a hand signal unless it's for injury or before the start of a set."
        ],
        keyPoints: [
          "Limited: starter out once, back once, same position",
          "Substitute can only be replaced by same starter",
          "Exceptional sub: for injury when no legal sub available",
          "Illegal sub: point to opponent + cancel points",
          "Sub zone: between attack lines at scorer's table"
        ],
        ruleRef: "Rules 15.5-15.10",
        diagram: "referee-positions",
        image: "https://images.unsplash.com/photo-1610036578923-81be15f8c3d9?w=800&q=80"
      },
      {
        id: "game-delays",
        title: "Game Delays",
        subtitle: "Types of delays and sanctions",
        content: [
          "A DELAY is any improper action that defers resumption of the game. Types include: (1) Delaying regular interruptions, (2) Prolonging interruptions after being told to resume, (3) Requesting illegal substitution, (4) Repeating improper request.",
          "DELAY WARNING: First delay in the match by any team member is sanctioned with a warning. This remains in force for the entire match and is recorded on the score sheet.",
          "DELAY PENALTY: The second and subsequent delays by any member of the SAME TEAM in the same match result in a point and service to the opponent.",
          "Delay sanctions imposed before or between sets are applied in the following set. All delay sanctions are TEAM sanctions (not individual).",
          "The first improper request in a match that doesn't affect or delay the game is rejected but recorded without other consequences. Further improper requests constitute a delay."
        ],
        keyPoints: [
          "First delay = warning (entire match)",
          "Subsequent delays = point to opponent",
          "Delay sanctions are TEAM sanctions",
          "Applied across the entire match",
          "First improper request = no sanction"
        ],
        ruleRef: "Rules 16.1-16.2",
        diagram: "sanction-cards"
      },
      {
        id: "exceptional-interruptions",
        title: "Exceptional Interruptions & Intervals",
        subtitle: "Injury, interference, and between-set rules",
        content: [
          "INJURY/ILLNESS: If a serious accident occurs during play, the referee stops the game immediately for medical assistance. The rally is replayed. If the player can't be substituted, they get a 3-minute recovery time (once per match).",
          "EXTERNAL INTERFERENCE: If there's any external interference during the game, play stops and the rally is replayed.",
          "PROLONGED INTERRUPTIONS: If the match is resumed on the same court within 4 hours, the interrupted set continues with same score, players, and positions. If on another court, the set is replayed with same lineup.",
          "INTERVALS: The time between sets is THREE MINUTES. During this time, courts are changed and lineups are submitted. The interval between sets 2 and 3 can be extended to 10 minutes by the organizer.",
          "CHANGE OF COURTS: Teams change courts after each set except the deciding set. In the deciding set, teams change when the leading team reaches 8 points - positions remain the same."
        ],
        keyPoints: [
          "Serious injury: replay the rally",
          "3-minute recovery time (once per match)",
          "External interference: replay rally",
          "Intervals: 3 minutes between sets",
          "Deciding set: change at 8 points"
        ],
        ruleRef: "Rules 17.1-18.2",
        vcNote: "Referees must allow time for floor wiping if too wet/slippery",
        diagram: "court-layout"
      }
    ]
  },
  libero: {
    id: "libero",
    chapter: 6,
    title: "The Libero Player",
    description: "Master the special rules for the Libero defensive specialist, including replacements and restrictions.",
    icon: "🛡️",
    color: "#eab308",
    colorClass: "bg-yellow-500",
    heroImage: "https://images.unsplash.com/photo-1588492069485-d05b56b2831d?w=1200&q=80",
    estimatedTime: "12 min",
    category: "indoor",
    ruleRange: "Rule 19",
    nextModule: "conduct",
    lessons: [
      {
        id: "libero-complete",
        title: "Complete Libero Rules",
        subtitle: "Designation, equipment, actions, and replacements",
        content: [
          "DESIGNATION: Each team may designate up to two Liberos from the roster. All Liberos must be recorded on the score sheet. Only one Libero may be on court at any time. The Acting Libero is the one on court.",
          "EQUIPMENT: The Libero must wear a uniform with a different dominant colour from any colour of the team. The uniform must clearly contrast with the rest of the team. Both Liberos can wear uniforms different from each other.",
          "PLAYING ACTIONS: The Libero may replace any player in a back-row position. They are restricted to back-row play and may NOT: (1) Serve, (2) Block or attempt to block, (3) Complete an attack hit if the ball is entirely above net height.",
          "FRONT ZONE SETTING RULE: If the Libero makes an overhand finger pass in the front zone, a teammate may NOT complete an attack hit on that ball if it is entirely above the top of the net. The ball may be freely attacked if the Libero sets from behind the attack line.",
          "REPLACEMENTS: Libero replacements are NOT substitutions - they are unlimited. There must be a completed rally between replacements. The Libero enters/exits only through the Libero Replacement Zone (bench side, attack line to end line)."
        ],
        keyPoints: [
          "Different coloured uniform required",
          "Can only replace back-row players",
          "Cannot serve, block, or attack above net",
          "Front zone overhand set restricts attack",
          "Replacements unlimited, not counted as subs"
        ],
        ruleRef: "Rules 19.1-19.3",
        vcNote: "14U-15U: No Libero allowed. 16U-18U: Only one Libero per set, may be re-designated between sets.",
        diagram: "court-layout",
        image: "https://images.unsplash.com/photo-1622279457486-62dbd21de89b?w=800&q=80"
      },
      {
        id: "libero-redesignation",
        title: "Libero Re-designation",
        subtitle: "What happens when the Libero can't continue",
        content: [
          "The Libero becomes UNABLE TO PLAY if injured, ill, expelled, or disqualified. The coach or game captain can also declare the Libero unable to play for any reason.",
          "TEAM WITH ONE LIBERO: If the only Libero becomes unable to play, any player NOT on the court (except the regular replacement player) may be re-designated as Libero for the rest of the match.",
          "If the Acting Libero becomes unable to play, they may be replaced by: (1) The regular replacement player, OR (2) A re-designated Libero directly. A re-designated Libero cannot play for the rest of the match.",
          "TEAM WITH TWO LIBEROS: If one becomes unable to play, the team continues with one. No re-designation is allowed unless the remaining Libero also becomes unable to continue.",
          "If the Libero is expelled or disqualified, they may be replaced immediately by the second Libero, or by a re-designated player if only one Libero was registered."
        ],
        keyPoints: [
          "Injured Libero = re-designate from bench",
          "Re-designated Libero can't return to normal play",
          "Two Liberos: play with one if other injured",
          "Expelled Libero: second Libero or re-designation",
          "Captain can be re-designated as Libero"
        ],
        ruleRef: "Rules 19.4-19.5",
        diagram: "court-layout"
      }
    ]
  },
  conduct: {
    id: "conduct",
    chapter: 7,
    title: "Participants' Conduct",
    description: "Understand sportsmanship requirements, misconduct categories, and the sanction scale.",
    icon: "⚖️",
    color: "#ef4444",
    colorClass: "bg-red-500",
    heroImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
    estimatedTime: "10 min",
    category: "indoor",
    ruleRange: "Rules 20-21",
    nextModule: "referees",
    lessons: [
      {
        id: "sportsmanship",
        title: "Requirements of Conduct",
        subtitle: "Sportsmanship and fair play",
        content: [
          "SPORTSMANLIKE CONDUCT: Participants must know the Official Volleyball Rules and abide by them. They must accept referees' decisions with sportsmanlike conduct without disputing them.",
          "In case of doubt, clarification may be requested only through the game captain. Participants must refrain from actions aimed at influencing referee decisions or covering up team faults.",
          "FAIR PLAY: Participants must behave respectfully and courteously in the spirit of fair play - not only towards referees but also towards other officials, opponents, teammates, and spectators.",
          "Communication between team members during the match is permitted. The coach may give instructions while standing or walking in the designated area.",
          "The Libero can be either the team captain or game captain, allowing them to communicate with referees if designated."
        ],
        keyPoints: [
          "Know and follow the rules",
          "Accept referee decisions without dispute",
          "Only game captain requests clarification",
          "Respectful to all: refs, opponents, spectators",
          "Team communication is permitted"
        ],
        ruleRef: "Rules 20.1-20.2",
        diagram: "referee-positions"
      },
      {
        id: "misconduct-sanctions",
        title: "Misconduct & Sanctions",
        subtitle: "Yellow cards, red cards, expulsion, and disqualification",
        content: [
          "MINOR MISCONDUCT: Not subject to sanctions. The referee prevents escalation through: Stage 1 - verbal warning through game captain, Stage 2 - YELLOW CARD to the team member (formal warning, recorded but no consequence).",
          "RUDE CONDUCT: Action contrary to good manners or moral principles. First offense = RED CARD (penalty: point and service to opponent). Second offense = EXPULSION. Third offense = DISQUALIFICATION.",
          "OFFENSIVE CONDUCT: Defamatory or insulting words/gestures expressing contempt. First offense = EXPULSION (red + yellow cards jointly). Second offense = DISQUALIFICATION.",
          "AGGRESSION: Actual physical attack or aggressive/threatening behaviour. First offense = DISQUALIFICATION (red + yellow cards shown separately).",
          "EXPULSION: Team member cannot participate for rest of the set, must go to dressing room. DISQUALIFICATION: Team member must leave for rest of the match. Both require immediate legal/exceptional substitution if the player was on court."
        ],
        keyPoints: [
          "Yellow card = warning (no penalty)",
          "Red card = penalty (point to opponent)",
          "Red + Yellow jointly = EXPULSION (rest of set)",
          "Red + Yellow separately = DISQUALIFICATION (rest of match)",
          "Aggression = immediate disqualification"
        ],
        ruleRef: "Rules 21.1-21.6",
        vcNote: "Expelled/disqualified must leave Competition Control Area including spectator seating",
        diagram: "sanction-cards",
        image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"
      }
    ]
  },
  referees: {
    id: "referees",
    chapter: 8,
    title: "Referees & Signals",
    description: "Learn the referee roles, responsibilities, scorer duties, line judge positions, and all official hand signals.",
    icon: "🏁",
    color: "#f97316",
    colorClass: "bg-orange-500",
    heroImage: "https://images.unsplash.com/photo-1578763363228-6e8428de69b2?w=1200&q=80",
    estimatedTime: "20 min",
    category: "indoor",
    ruleRange: "Rules 22-32",
    nextModule: "scorekeeping",
    lessons: [
      {
        id: "refereeing-corps",
        title: "Refereeing Corps",
        subtitle: "First referee, second referee, challenge referee, reserve referee",
        content: [
          "The REFEREEING CORPS consists of: First Referee (R1), Second Referee (R2), Challenge Referee, Reserve Referee, Scorer, Assistant Scorer, and 2-4 Line Judges.",
          "FIRST REFEREE (R1): Stands on referee's stand at one end of net, view ~50 cm above net. Directs the match from start to end with authority over all officials and team members. Their decisions are FINAL.",
          "R1 may overrule other officials' decisions if mistaken. They control ball retrievers and moppers, decide matters not in the rules, and must not permit discussion of their decisions.",
          "SECOND REFEREE (R2): Stands outside the court near the post, opposite R1. Assists R1 and has their own jurisdiction. Controls substitutions, timeouts, team benches, and warm-up areas.",
          "R2 decides: penetration under net, receiving team's positional faults, net contact on blocker's side, completed block by back-row/Libero, ball crossing outside crossing space on their side."
        ],
        keyPoints: [
          "R1: on stand, 50 cm above net, FINAL decisions",
          "R1: controls entire match, all officials",
          "R2: at post, opposite R1, assists R1",
          "R2: controls subs, timeouts, benches",
          "R2: whistles their own faults (penetration, position)"
        ],
        ruleRef: "Rules 22.1-24.3",
        diagram: "referee-positions",
        image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80"
      },
      {
        id: "scorers",
        title: "Scorers",
        subtitle: "Scorer and assistant scorer responsibilities",
        content: [
          "SCORER: Sits at scorer's table opposite R1. Fills the score sheet according to rules, cooperating with R2. Uses buzzer to notify irregularities.",
          "BEFORE THE MATCH: Records match/team data including Liberos, obtains captain and coach signatures, records starting lineups from lineup sheets.",
          "DURING THE MATCH: Records points scored, controls serving order (indicates errors immediately after service hit), acknowledges and announces substitution requests, notifies referees of out-of-order requests.",
          "The scorer announces end of sets, the 8th point in deciding set, records warnings/sanctions/improper requests, and controls interval between sets.",
          "ASSISTANT SCORER: Sits beside scorer. Records Libero replacements on the Libero control sheet, operates manual scoreboard, notifies referees of Libero replacement faults using buzzer."
        ],
        keyPoints: [
          "Scorer: records points, controls serving order",
          "Scorer: uses buzzer for rotation errors",
          "Scorer: announces 8th point in deciding set",
          "Assistant: tracks Libero replacements",
          "Both: sign score sheet at match end"
        ],
        ruleRef: "Rules 27.1-28.2",
        diagram: "referee-positions"
      },
      {
        id: "line-judges",
        title: "Line Judges",
        subtitle: "Positioning and flag signals",
        content: [
          "If TWO line judges are used, they stand at corners closest to the right hand of each referee, diagonally 1-2 m from corner. Each controls both end line and sideline on their side.",
          "If FOUR line judges are used, they stand in the free zone 1-3 m from each corner, on the imaginary extension of the line they control.",
          "Line judges use FLAGS (40 x 40 cm) to signal: (1) Ball IN - point flag down, (2) Ball OUT - raise flag vertically, (3) Ball touched - raise flag and touch top with free hand.",
          "Additional signals: (4) Crossing space fault, outside object touch, or foot fault - wave flag over head and point to antenna or line, (5) Judgement impossible - cross arms in front of chest.",
          "At R1's request, a line judge must repeat their signal. Line judges control: touches of out balls, ball touching antenna, server's foot fault, any player stepping outside court at service."
        ],
        keyPoints: [
          "2 line judges: diagonal from referees",
          "4 line judges: 1-3m from each corner",
          "Flag down = IN, flag up = OUT",
          "Touch top of flag = ball touched",
          "Wave flag = crossing space/foot fault"
        ],
        ruleRef: "Rules 29.1-29.2",
        diagram: "flag-signals"
      },
      {
        id: "official-signals",
        title: "Official Hand Signals",
        subtitle: "All 25 referee signals and line judge signals",
        content: [
          "GAME MANAGEMENT: (1) Authorization to serve - move hand to indicate direction, (2) Team to serve - extend arm to serving team's side, (3) Change of courts - twist forearms around body, (4) Timeout - form T with hands, (5) Substitution - circular motion of forearms.",
          "SCORING/END: (6-8) Misconduct cards - yellow=warning, red=penalty, both jointly=expulsion, both separately=disqualification, (9) End of set/match - cross forearms in front of chest.",
          "SERVICE FAULTS: (10) Ball not tossed - lift extended arm palm up, (11) Delay in service - raise 8 fingers, (12) Blocking fault/screening - raise both arms vertically palms forward.",
          "PLAYING FAULTS: (13) Positional/rotational fault - circular motion with forefinger, (14) Ball IN - point at floor, (15) Ball OUT - forearms vertical palms toward body, (16) Catch - slowly lift forearm palm up, (17) Double contact - raise 2 fingers, (18) Four hits - raise 4 fingers.",
          "NET/ATTACK: (19) Net touched - indicate side of net, (20) Reaching beyond - hand above net palm down, (21) Attack fault - downward motion with forearm, (22) Penetration/line fault - point at line, (23) Double fault/replay - raise both thumbs, (24) Ball touched - brush fingertips, (25) Delay warning/penalty - cover wrist with card."
        ],
        keyPoints: [
          "T-shape = timeout",
          "Circular forearms = substitution",
          "Point down = ball IN",
          "Forearms up, palms in = ball OUT",
          "Circular finger = rotation fault"
        ],
        ruleRef: "Rules 30.1-30.2",
        diagram: "hand-signals",
        image: "https://images.unsplash.com/photo-1578763363228-6e8428de69b2?w=800&q=80"
      }
    ]
  },
  scorekeeping: {
    id: "scorekeeping",
    chapter: 9,
    title: "Scorekeeping",
    description: "Learn how to complete the official volleyball score sheet, record points, substitutions, timeouts, and sanctions.",
    icon: "📋",
    color: "#0ea5e9",
    colorClass: "bg-sky-500",
    heroImage: "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1200&q=80",
    estimatedTime: "20 min",
    category: "indoor",
    ruleRange: "Score Sheet",
    lessons: [
      {
        id: "before-match",
        title: "Before the Match",
        subtitle: "Setting up the score sheet correctly",
        content: [
          "The scorer must check that all identifying information for the match has been properly filled in. This includes the name of the competition, city, country code, date, time, gymnasium name, and division.",
          "Record the round to be played (Elimination, Play-Off, or Final), match number, division (Men/Women), and category (Masters, Senior, Junior, or age group). Teams are listed according to the programme order.",
          "In the lower right-hand part of the form, record team names, player numbers and names (with a circle around the team captain's number), and the Libero player on the special line marked 'L'.",
          "Record the Head Coach name and registration number, Assistant Coach, Trainer, and Medical Doctor for each team. Obtain signatures from both team captains and coaches after they verify the information.",
          "In the 'APPROVAL' section, print the names and countries of the 1st Referee, 2nd Referee, Scorer, Assistant Scorer, and Line Judges."
        ],
        keyPoints: [
          "Verify all match information is complete",
          "Circle the captain's number on roster",
          "Libero recorded on special 'L' line",
          "Get captain and coach signatures",
          "Record all officials in APPROVAL section"
        ],
        ruleRef: "Score Sheet Sections 1.1-1.20",
        diagram: "court-layout"
      },
      {
        id: "after-toss",
        title: "After the Toss",
        subtitle: "Recording toss results and starting lineups",
        content: [
          "From the 1st Referee, obtain which side of the court each team begins on and which team serves first. From the 2nd Referee, obtain the line-up sheet for the 1st set with player positions I-VI and the Libero number.",
          "In the 'Set 1' square, record the team codes 'A' and 'B' in boxes corresponding to their sides (team 'A' on scorer's left, 'B' on right). Mark 'S' for the serving team and 'R' for the receiving team.",
          "For Set 2, the teams switch sides, so record team 'A' on the right and team 'B' on the left. The team that received first in Set 1 now serves first in Set 2.",
          "Record starting player numbers under Roman numerals I to VI on the 'STARTING PLAYERS' line, following the order from the line-up sheet obtained from the 2nd referee.",
          "The same pattern alternates for subsequent sets: Set 3 follows Set 1's arrangement, Set 4 follows Set 2's arrangement."
        ],
        keyPoints: [
          "Team 'A' = scorer's left, 'B' = scorer's right",
          "Mark 'S' for serving team, 'R' for receiving",
          "Teams switch sides each set",
          "Service alternates each set",
          "Record positions I-VI from line-up sheet"
        ],
        ruleRef: "Score Sheet Sections 2.1-2.4",
        diagram: "court-layout"
      },
      {
        id: "recording-points",
        title: "Recording Points & Service",
        subtitle: "Tracking the score during the match",
        content: [
          "At match start, record the time in the 'START time' box. The 'POINTS' column (numbered 1-48) is used to record points by slashing (/) each number as points are scored.",
          "When a team serves, tick (✓) the service box number in that player's column. When they lose service, record the total points scored during that service in the same box.",
          "Example: If Team A's player #8 serves first and wins 4 points before losing service, slash numbers 1-4 in the POINTS column, then write '4' in box 1 of player #8's column.",
          "When service changes to the other team, mark an X in their column I (they must rotate), then tick the box in column II for the new server. Continue this pattern throughout the set.",
          "At set end, record the time in 'END time', circle the final point in the last server's box, and cancel any unused numbers in the POINTS column."
        ],
        keyPoints: [
          "Slash (/) points as they're scored",
          "Tick (✓) service box when player serves",
          "Write total points when service lost",
          "X marks rotation before new server",
          "Circle (O) final point at set end"
        ],
        ruleRef: "Score Sheet Sections 3.1-3.4",
        diagram: "court-layout"
      },
      {
        id: "deciding-set",
        title: "The Deciding Set",
        subtitle: "Special procedures for Set 5",
        content: [
          "In the deciding set (5th set), after the toss, record team letters 'A' or 'B' in the blank circles, placing the team on the scorer's left in the left section.",
          "Follow the same procedure as Set 1 using the first two sections of the 'SET 5' square until the 8th point is scored.",
          "When either team reaches 8 points, teams change courts. The scorer continues recording in the third (far right) section for the team originally in the left section.",
          "Record the points at the moment of change in the 'POINTS AT CHANGE' box. Continue marking points in the far right 'POINTS' column after the court change.",
          "The deciding set is played to 15 points (not 25), but still requires a 2-point lead. If tied at 14-14, play continues until one team leads by 2."
        ],
        keyPoints: [
          "Court change at 8 points",
          "Record 'POINTS AT CHANGE' in box",
          "Continue in third section after change",
          "Played to 15 points (not 25)",
          "Still requires 2-point lead"
        ],
        ruleRef: "Score Sheet Section 3.5",
        diagram: "court-layout"
      },
      {
        id: "substitutions-timeouts",
        title: "Substitutions & Timeouts",
        subtitle: "Recording player changes and breaks",
        content: [
          "For substitutions, write the substitute's number in the box below the player leaving the court. In the 'SUBSTITUTES SCORE' box above, record both teams' scores at that moment (substituting team's score first).",
          "When the original player returns, verify their number matches the one above the substitute. Circle the substitute's number to show they cannot re-enter. Record the score in the lower 'SUBSTITUTES SCORE' box.",
          "Each team gets TWO timeouts per set. Record timeouts in the boxes marked 'T' below the POINTS column. Write both teams' scores (requesting team's score first).",
          "Example: Team B's first timeout at score 7:12 would show '7:12' in the upper T box. Their second timeout at 21:23 would show '21:23' in the lower T box.",
          "Exceptional substitutions for injured players or Libero replacements must be noted in the 'REMARKS' section with set number, team name, player numbers/names, and score."
        ],
        keyPoints: [
          "Substitute number goes BELOW departing player",
          "Record score at each substitution",
          "Circle player who cannot re-enter",
          "Two timeout boxes per team per set",
          "Note exceptional subs in REMARKS"
        ],
        ruleRef: "Score Sheet Sections 3.6-3.7",
        diagram: "court-layout"
      },
      {
        id: "sanctions-recording",
        title: "Recording Sanctions",
        subtitle: "Documenting warnings, penalties, and expulsions",
        content: [
          "All misconduct sanctions are recorded in the lower left square of the score sheet. Mark the player number or official's initial (C=Coach, AC=Assistant Coach, T=Trainer, Med=Medical).",
          "Use column letters: 'W' for Warning, 'P' for Penalty, 'E' for Expulsion, 'D' for Disqualification. Also record 'A' or 'B' for the team, set number, and score at the sanction.",
          "Points scored due to opponent misconduct penalties must be circled (O) in the POINTS column to distinguish them from regular points.",
          "Delay sanctions use 'D' in the first column, then 'W' for delay warning or 'P' for delay penalty. Delay penalties result in loss of rally - record and circle the point.",
          "All sanctions remain in effect for the entire match once issued. First warning carries forward; subsequent misconduct by same team member escalates the sanction."
        ],
        keyPoints: [
          "W=Warning, P=Penalty, E=Expulsion, D=Disqualification",
          "Circle penalty points in POINTS column",
          "Record player number or official initial",
          "Include set number and score",
          "Sanctions carry forward through match"
        ],
        ruleRef: "Score Sheet Section 3.8",
        diagram: "sanction-cards",
        image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"
      },
      {
        id: "after-match",
        title: "After the Match",
        subtitle: "Completing the RESULTS section",
        content: [
          "In the RESULTS square, record team 'A' on the left and team 'B' on the right. For each set, record the duration in brackets and mark 'W' for the winning team.",
          "Record the points scored by each team in each set, and calculate totals. Also total the substitutions (S) and timeouts (T) used by each team across all sets.",
          "Calculate and record: Total Set Duration (sum of all set times), Match Starting Time, Match Ending Time, and Total Match Duration.",
          "Record the winning team's name and the final set score (e.g., '3:1'). Any protests must be recorded in the REMARKS section, dictated or written by the team captain.",
          "Obtain signatures in order: Assistant Scorer and/or Scorer, both Team Captains, 2nd Referee, then 1st Referee. This completes the official match record."
        ],
        keyPoints: [
          "Record set duration in brackets",
          "Mark 'W' for set winner",
          "Total all points, subs, and timeouts",
          "Calculate total match duration",
          "Get all signatures in correct order"
        ],
        ruleRef: "Score Sheet Section 4.1-4.10",
        vcNote: "For a video tutorial on scorekeeping, watch the Saskatchewan Volleyball scoresheet tutorial: https://www.youtube.com/watch?v=EyB7ji_LwT0 — Note: The Ontario Volleyball Association uses the same score sheet format as Saskatchewan Volleyball.",
        diagram: "court-layout"
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 4v4 RALLYBALL MODULES
  // ═══════════════════════════════════════════════════════════
  "rallyball-4v4": {
    id: "rallyball-4v4",
    chapter: 10,
    chapterLabel: "4v4",
    title: "4v4 Rallyball",
    description: "Master the rules of 4v4 Rallyball — OVA's entry-level format featuring smaller courts, diamond/square formations, Tripleball sequences, and rotational substitutions.",
    icon: "🏐",
    color: "#f97316",
    colorClass: "bg-orange-500",
    heroImage: "/images/4v4-rallyball-hero.png",
    estimatedTime: "15 min",
    category: "rallyball-4v4",
    ruleRange: "4v4 Rules",
    lessons: [
      {
        id: "4v4-court-equipment",
        title: "Court & Equipment",
        subtitle: "Court dimensions, net heights, and ball specifications",
        content: [
          "4v4 Rallyball is played on a smaller court measuring 7m × 14m, or as close as the facility has available — typically a badminton doubles court. This compact size encourages faster play and more ball contacts per player.",
          "The net height is set at 2.15m for Girls divisions and 2.20m for Boys/Co-Ed divisions. These heights are slightly lower than standard indoor to accommodate the younger age group (2014 & Under birth year, with 24-month eligibility).",
          "The official ball for 4v4 Rallyball is the Mikasa VUL 500. This is a lighter training ball designed for younger athletes, promoting proper technique development without the heaviness of competition balls.",
          "There is no Libero in 4v4 Rallyball. The format is intentionally simplified to focus on fundamental skill development. A single referee is provided for each match.",
          "Divisions are split into Boys/Co-Ed and Girls. There are no divisional splits during the regular season, though Ontario Championships will be split into Division 1 and Division 2."
        ],
        keyPoints: [
          "Court: 7m × 14m (badminton doubles)",
          "Net: 2.15m Girls, 2.20m Boys/Co-Ed",
          "Ball: Mikasa VUL 500",
          "No Libero allowed",
          "Age: 2014 & Under (24-month eligibility)"
        ],
        ruleRef: "OVA 4v4 Rallyball Regulations",
        diagram: "court-layout"
      },
      {
        id: "4v4-teams-formations",
        title: "Teams & Formations",
        subtitle: "Roster size, formations, and designated setter",
        content: [
          "The recommended roster size is 6-8 athletes. Larger rosters are encouraged to be split into 2 teams for the 4v4 competition. A team that is split up will be placed in the same regular season event.",
          "Teams can use either a DIAMOND formation or a SQUARE formation (2 front, 2 back). Both formations have their strategic advantages — the diamond provides a central front-row player for setting, while the square provides more balanced coverage.",
          "Teams must designate the setter position and maintain it for the entire set. The designated setting position MUST be front row. This rule ensures proper setter development.",
          "All team members must play in each set. The only exception is if a team has more than 10 players on their roster, in which case they can be split into two groups who each participate in a single set. If the match goes to a third set tiebreaker, the coach can play one of the groups a second time.",
          "The server is always the player who has just rotated from the front row to the back row. In a box/square formation, this is the player from the front row right side. In a diamond formation, this is the player from the front row middle position rotating to the right."
        ],
        keyPoints: [
          "Roster: 6-8 athletes recommended",
          "Diamond or Square (2 front, 2 back) formation",
          "Designated setter must be front row",
          "All players must play each set",
          "Server = player who just rotated from front to back"
        ],
        ruleRef: "OVA 4v4 Playing Regulations",
        diagram: "player-positions"
      },
      {
        id: "4v4-tripleball",
        title: "The Tripleball System",
        subtitle: "How the 3-rally sequence works in 4v4",
        content: [
          "4v4 Rallyball uses the TRIPLEBALL system — a sequence of three rallies designed to promote better skill development, participation, and fun. Each sequence consists of: (1) a served ball, (2) a free ball tossed to the receiving team, and (3) a free ball tossed to the serving team.",
          "Players not on the court must rotate INTO the game upon completion of the Tripleball sequence that follows their serve. For example: Player A serves the ball and stays on court for the following 2 free balls to complete the sequence. Once complete, Player A rotates out and Player B takes their place.",
          "The match format is 3 straight sets to 15 points with no cap in any set. This means there is no deciding set played to a lower point total — all three sets go to 15.",
          "First serve alternation: If Team A serves first in set 1, then Team B serves first in set 2, and Team A serves first in set 3. The first serve in a new set is always given to the team that did not serve first in the previous set.",
          "Substitutions are rotational — meaning players cycle in and out as part of the Tripleball rotation system rather than using traditional substitution rules. Specialization is not permitted in 4v4 Rallyball."
        ],
        keyPoints: [
          "3-rally sequence: serve → free ball (receiver) → free ball (server)",
          "Players rotate out after completing their Tripleball sequence",
          "Match: 3 straight sets to 15 (no cap)",
          "Rotational substitutions only",
          "No specialization permitted"
        ],
        ruleRef: "OVA 4v4 Tripleball Regulations",
        diagram: "court-layout"
      },
      {
        id: "4v4-playing-regulations",
        title: "Playing Regulations",
        subtitle: "Serve receive, attacking, and warm-up rules",
        content: [
          "OVERHAND SERVE RECEIVE IS NOT ALLOWED. If a team receives a serve with an overhand pass, this is a fault and the point goes to the other team. However, if a team receives a free ball TOSS with an overhand pass, this is a re-toss (not a fault).",
          "The player(s) in the back court (serve receiver/server) are permitted to attack from ANYWHERE on the court. There is no back-row attack line restriction in 4v4 Rallyball.",
          "WARM-UP PROTOCOL — First match of the day: 8 min shared court, 4 min exclusive for serving team, 4 min exclusive for receiving team. All remaining matches: 2 min shared court, 4 min exclusive per team. No shared hitting or travelling under net during warm-ups.",
          "A team's set ratio from the Bugarski Cup will be used to help seed teams for Ontario Championships. This ranking is calculated from regular season events.",
          "No medals are awarded until the Ontario Championships. The focus during the regular season is developmental. The Ontario Championships is a 2-day event with medals for Division 1 and Division 2."
        ],
        keyPoints: [
          "No overhand serve receive (fault)",
          "Overhand free ball toss receive = re-toss only",
          "Back court players can attack from anywhere",
          "Warm-up: 8+4+4 (first match), 2+4+4 (rest)",
          "Set ratio seeds Ontario Championships"
        ],
        ruleRef: "OVA 4v4 Playing Regulations",
        vcNote: "Athletes need a Recreational membership — upgrade to full competitive membership if participating in 6v6 or TLS competitions.",
        diagram: "court-layout"
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 6v6 RALLYBALL MODULES
  // ═══════════════════════════════════════════════════════════
  "rallyball-6v6": {
    id: "rallyball-6v6",
    chapter: 11,
    chapterLabel: "6v6",
    title: "6v6 Rallyball",
    description: "Learn the unique rules of 6v6 Rallyball — OVA's developmental format with Tripleball sequences, designated setter positions, and serve reception rules.",
    icon: "🏐",
    color: "#8b5cf6",
    colorClass: "bg-violet-500",
    heroImage: "/images/6v6-rallyball-hero.png",
    estimatedTime: "18 min",
    category: "rallyball-6v6",
    ruleRange: "6v6 Rules",
    lessons: [
      {
        id: "6v6-court-equipment",
        title: "Court & Equipment",
        subtitle: "Court dimensions, net heights, and divisions",
        content: [
          "6v6 Rallyball is played on a full-size court measuring 9m × 18m — the same dimensions as standard indoor volleyball. This prepares athletes for the transition to competitive 6v6 play.",
          "Net heights are 2.15m for Female and 2.20m for Male divisions. These are slightly lower than standard competition heights to accommodate the younger age group (2013 & Under birth year, with 24-month eligibility).",
          "The official ball is the Mikasa VQ200W-OVA. This is a step up from the 4v4 ball, moving closer to competition-grade equipment. All athletes require a full competitive membership.",
          "Girls divisions self-declare into three tiers: Select (Tier 1), Championship (Tier 2), or Trillium (Tier 3) for all events. Boys divisions use a realignment system throughout the season based on results.",
          "There is NO Libero in 6v6 Rallyball. A single referee is provided for matches. Medals are awarded for ALL events and Ontario Championships, unlike 4v4 where medals are only at Championships."
        ],
        keyPoints: [
          "Court: 9m × 18m (full size)",
          "Net: 2.15m Female, 2.20m Male",
          "Ball: Mikasa VQ200W-OVA",
          "No Libero allowed",
          "Girls: 3 self-declare tiers; Boys: realignment"
        ],
        ruleRef: "OVA 6v6 Rallyball Regulations",
        diagram: "court-layout"
      },
      {
        id: "6v6-tripleball-service",
        title: "Tripleball & Service",
        subtitle: "The 3-rally sequence and service rotation",
        content: [
          "The TRIPLEBALL system in 6v6 follows the same 3-rally sequence: (1) the game starts with a service, (2) a free ball is tossed to the receiving team, (3) a free ball is tossed to the serving team. Every ball introduced is worth one point.",
          "The service ROTATES between teams after each three-ball sequence. A team must rotate and introduce a new server when it is their turn to serve. This ensures continuous rotation through the lineup.",
          "Teams are required to declare on the scoresheet a DESIGNATED SETTER POSITION prior to the start of each set. For example, if a team circles position 3 on their lineup, the athlete in position 3 is the 'setter' throughout that set.",
          "The setter is allowed to come out of position #1, #2, or #3. The setter position must remain the same for the entire set, but can be changed between sets if the team chooses.",
          "Other players are permitted to perform the second contact if needed, but it is up to the official's discretion to issue a warning if the team is not using their designated setter position properly. Further discipline is possible if the team refuses to follow this rule."
        ],
        keyPoints: [
          "3-rally: serve → free ball (receiver) → free ball (server)",
          "Service rotates between teams after each sequence",
          "Must declare designated setter on scoresheet",
          "Setter can come from position 1, 2, or 3",
          "Setter position stays same for entire set"
        ],
        ruleRef: "OVA 6v6 Rallyball Rules",
        diagram: "player-positions"
      },
      {
        id: "6v6-serving-reception",
        title: "Serving & Reception Rules",
        subtitle: "Serve receive restrictions and positional rules",
        content: [
          "OVERHAND SERVE RECEIVE IS NOT ALLOWED. If a team receives a serve with an overhand pass, this is a fault and the point goes to the other team. However, if a team receives a toss with an overhand pass, this is a re-toss (not a fault).",
          "When SERVING, players cannot switch positions after the serve. Players must remain in their rotational order until the ball crosses back to their side of the net. Once the ball crosses back over, normal volleyball movement is allowed during the play, but players must come back to rotational order once the ball is sent to the other side.",
          "When in SERVE RECEPTION, the players' serve reception configuration needs to be the SAME throughout the set along with the designated setter position. Teams cannot change their receive pattern.",
          "COMMON MISINTERPRETATION: 'Teams can isolate players in serve reception in certain rotations' — this is FALSE. Teams need to keep the same serve-reception configuration throughout the whole set. A position can be isolated (e.g., athlete in position 1), but that position needs to be consistently isolated throughout.",
          "Requests for substitutions can only occur BETWEEN a three-ball sequence, not during one. In the deciding set, teams switch sides once a team reaches 8 points. If this occurs during a Tripleball sequence, the change of court will be made after the sequence is completed."
        ],
        keyPoints: [
          "No overhand serve receive (fault → point to opponent)",
          "Overhand toss receive = re-toss only",
          "Can't switch positions until ball returns to your side",
          "Same serve-receive configuration all set long",
          "Subs only between Tripleball sequences"
        ],
        ruleRef: "OVA 6v6 Positional Regulations",
        diagram: "court-layout"
      },
      {
        id: "6v6-free-ball-tosser",
        title: "Free Ball & Tosser Guidelines",
        subtitle: "How free balls are introduced and tosser responsibilities",
        content: [
          "The free ball toss occurs when the three front row athletes are standing at the net and READY TO TRANSITION. Once there is a verbal/non-verbal cue (tosser can say 'Free Ball' or slap the volleyball), athletes are permitted to transition off the net.",
          "The free ball introduction toss can be directed to position 5 or position 6. The toss must be CONSISTENT in each match — tossers cannot switch between positions during a match.",
          "Free balls MUST be received with a forearm pass, otherwise a replay will occur. This rule promotes fundamental passing skills. However, an overpass from the free ball toss is NOT a re-toss — play continues normally.",
          "GUIDELINES FOR TOSSERS: (1) The Head Coach, Assistant Coach, or a competent volunteer may be the Tosser and introduce balls to their own team. The Tosser is NOT allowed to verbally coach while tossing. (2) Balls must be tossed underhand with two hands, with little to no spin, above antenna height.",
          "The Tosser can step into the court to introduce the ball but must immediately move a safe distance away after the toss. The free ball must be introduced directly to the athlete in position 5 or 6 — otherwise a replay will occur. Tossers should encourage a fast-paced transition between rallies."
        ],
        keyPoints: [
          "Free ball only when front row at net and ready",
          "Toss to position 5 or 6 consistently",
          "Must receive free ball with forearm pass",
          "Tosser: underhand, two hands, above antenna height",
          "No coaching while tossing"
        ],
        ruleRef: "OVA 6v6 Tosser Guidelines",
        vcNote: "The Head Coach, Assistant Coach, or competent volunteer can be the Tosser. They introduce balls to their OWN team only.",
        diagram: "court-layout"
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // BEACH VOLLEYBALL MODULES
  // ═══════════════════════════════════════════════════════════
  "beach": {
    id: "beach",
    chapter: 12,
    chapterLabel: "Beach",
    title: "Beach Volleyball",
    description: "Learn the complete FIVB Beach Volleyball rules — from sand court specifications to the unique ball handling, blocking, and two-player team format.",
    icon: "🏖️",
    color: "#06b6d4",
    colorClass: "bg-cyan-500",
    heroImage: "/images/beach-volleyball-hero.png",
    estimatedTime: "25 min",
    category: "beach",
    ruleRange: "FIVB Beach Rules",
    lessons: [
      {
        id: "beach-court-equipment",
        title: "Court & Equipment",
        subtitle: "Sand court dimensions, net heights, and ball specifications",
        content: [
          "The beach volleyball court is a rectangle measuring 16m × 8m — smaller than indoor (18m × 9m). It is surrounded by a free zone of at least 3m on all sides (5-6m for FIVB competitions). The free playing space above is minimum 7m (12.5m for FIVB).",
          "The playing surface must be composed of LEVELLED SAND, as flat and uniform as possible, free of rocks, shells, and anything else which could cause injury. For FIVB competitions, sand must be at least 40cm deep and composed of fine loosely compacted grains.",
          "There is NO CENTRE LINE on a beach volleyball court. Both side and end lines are drawn inside the dimensions with ribbons. Court lines should be ribbons made of resistant material, and any exposed anchors must be of soft, flexible material. All lines are 5cm wide.",
          "Net height is 2.43m for men and 2.24m for women — same as indoor. Youth heights: 16U both 2.24m, 14U both 2.12m, 12U both 2.00m. The net is 8.5m long (shorter than indoor's 9.5-10m) and 1m wide.",
          "The ball circumference is 66-68cm (slightly larger than indoor's 65-67cm) and weighs 260-280g. The inside pressure is much lower: 0.175-0.225 kg/cm² (vs indoor's 0.30-0.325), making it travel slower in the outdoor environment. The ball must be waterproof for outdoor conditions."
        ],
        keyPoints: [
          "Court: 16m × 8m (smaller than indoor)",
          "Sand: at least 40cm deep for FIVB",
          "No centre line on court",
          "Net: same heights as indoor (2.43m/2.24m)",
          "Ball: 66-68cm, lower pressure (0.175-0.225 kg/cm²)"
        ],
        ruleRef: "FIVB Beach Rules 1-3",
        diagram: "court-layout"
      },
      {
        id: "beach-teams-uniforms",
        title: "Teams & Uniforms",
        subtitle: "2-player teams, equipment, and captains",
        content: [
          "A beach volleyball team is composed exclusively of TWO PLAYERS. Only the two players recorded on the score sheet have the right to participate in the match. There are NO substitutions in beach volleyball.",
          "One of the players is the team captain, indicated on the score sheet. Only the captain can speak to referees while the ball is out of play — to ask for rule explanations, request equipment changes, or request timeouts.",
          "Player equipment consists of shorts or a bathing suit. A jersey or 'tank-top' is optional except when specified in Tournament Regulations. Players must play BAREFOOT except when authorized by the 1st referee.",
          "Players' jerseys (or shorts if playing without a shirt) must be numbered 1 and 2. The number must be on the chest (or front of shorts), minimum 10cm height, with stripe minimum 1.5cm wide.",
          "FORBIDDEN: Objects that may cause injury or give artificial advantage. Players may wear glasses or lenses at their own risk. Compression pads may be worn for protection. For FIVB senior competitions, these devices must match the uniform colour."
        ],
        keyPoints: [
          "Exactly 2 players per team",
          "No substitutions allowed",
          "Play barefoot (normally)",
          "Jerseys numbered 1 and 2 only",
          "Captain is only one who can speak to refs"
        ],
        ruleRef: "FIVB Beach Rules 4-5",
        diagram: "court-layout"
      },
      {
        id: "beach-scoring-format",
        title: "Scoring & Format",
        subtitle: "Sets, match format, and court switches",
        content: [
          "Beach volleyball uses the Rally Point System, just like indoor. The team winning a rally scores a point. When the receiving team wins a rally, it gains a point AND the right to serve — but the serving player must be ALTERNATED each time.",
          "A set (except the deciding 3rd set) is won by the team which first scores 21 POINTS with a minimum lead of 2 points. This is lower than indoor's 25 points, keeping beach matches dynamic and fast-paced.",
          "The match is won by the team that wins TWO SETS (best of 3). The deciding 3rd set is played to 15 points with a minimum 2-point lead — same as indoor.",
          "COURT SWITCHES happen every 7 POINTS combined in sets 1 and 2 (i.e., when the total points is a multiple of 7). In the deciding set, teams switch every 5 POINTS. This ensures neither team has an unfair advantage from wind or sun.",
          "Players are FREE to position themselves — there are NO determined positions on the court. There are NO positional order faults. However, service order must be maintained throughout the set as determined by the captain after the toss."
        ],
        keyPoints: [
          "Sets to 21 points (not 25), 2-pt lead",
          "Deciding set to 15 points",
          "Court switch every 7 points (5 in deciding set)",
          "Server must alternate each time team gains serve",
          "No positional faults — free positioning"
        ],
        ruleRef: "FIVB Beach Rules 6-7",
        diagram: "court-layout"
      },
      {
        id: "beach-ball-handling",
        title: "Ball Handling & Playing Actions",
        subtitle: "Block counts as a hit, setting rules, and no open-hand tips",
        content: [
          "The BIGGEST difference from indoor: In beach volleyball, the BLOCK COUNTS as a team hit. Teams get a maximum of THREE HITS to return the ball — and the block contact IS one of those three. After a block, the team only has TWO remaining hits.",
          "SETTING OVER THE NET: When using an overhand finger pass to direct the ball toward the opponent, the player's shoulders must be SQUARE (perpendicular) to the direction of the set. This is a unique beach rule that prevents deceptive sets across the net.",
          "The ball must be hit, not caught or thrown. However, beach volleyball is more lenient on contact — at the FIRST HIT (any hit not involving an overhand finger action), even if the ball is momentarily held, it is legal as long as it is not caught or thrown in a clear manner.",
          "OPEN-HAND TIPS AND DINKS ARE NOT ALLOWED. When directing the ball toward the opponent with a finger action, the ball must be contacted with the heel or closed hand (knuckles). Tips must use a 'poke' or 'cobra' technique — never open fingertips.",
          "The ball may touch any part of the body. Consecutive contacts are allowed during one action for the first team hit, similar to indoor. The ball is IN if any part touches the court boundary lines."
        ],
        keyPoints: [
          "Block COUNTS as a team hit (3 total including block)",
          "Overhand set over net: shoulders must be perpendicular",
          "No open-hand tips — use knuckles/cobra only",
          "First hit allows momentary hold",
          "Court lines are IN (same as indoor)"
        ],
        ruleRef: "FIVB Beach Rules 9-11, 13-14",
        diagram: "court-layout"
      },
      {
        id: "beach-service-attack",
        title: "Service & Attack",
        subtitle: "Serving rules, screening, and attack characteristics",
        content: [
          "The first service in the 1st set is determined by the toss. In the 2nd set, the loser of the 1st set toss gets the choice. A new toss is conducted for the deciding set. The winner can choose to serve/receive or choose a side.",
          "Service execution is similar to indoor: the ball must be hit with one hand or any part of the arm after being tossed or released. The server must not touch the end line or court at the moment of contact. After the hit, they may step onto the court.",
          "SCREENING is not allowed — with only 2 players, there's effectively only the partner standing on the court. The teammate of the server must not prevent opponents from seeing the server or the ball flight path through screening.",
          "An attack hit includes all actions directing the ball toward the opponent's court except service and block. Since there are no positions in beach volleyball, both players can attack from anywhere at any height.",
          "BLOCKING THE SERVICE IS FORBIDDEN, same as indoor. Since the block counts as a team hit, a blocker who touches the ball only has 2 more team hits available. Consecutive contacts during blocking are legal."
        ],
        keyPoints: [
          "New toss for deciding set",
          "Service rules similar to indoor",
          "No screening by partner",
          "Both players can attack from anywhere",
          "Block service = fault (same as indoor)"
        ],
        ruleRef: "FIVB Beach Rules 12-14",
        diagram: "court-layout"
      },
      {
        id: "beach-interruptions-conduct",
        title: "Interruptions & Conduct",
        subtitle: "Timeouts, delays, court switches, and sanctions",
        content: [
          "Each team is allowed ONE timeout per set, lasting 30 SECONDS. This is fewer than indoor's 2 timeouts. Technical timeouts may apply in FIVB competitions at specific point totals.",
          "Since there are NO SUBSTITUTIONS in beach volleyball, there are no substitution-related interruptions. This makes the game flow much faster than indoor volleyball.",
          "If a player is injured and cannot continue, the team is declared INCOMPLETE and loses the set or match. The opponent is given the points/sets needed to win. There is no recovery time or exceptional substitution like in indoor.",
          "The MISCONDUCT and SANCTIONS scale is similar to indoor: (1) Minor misconduct → verbal warning → Yellow Card (warning). (2) Rude conduct → Red Card (penalty: point to opponent). (3) Offensive conduct → Expulsion (red + yellow jointly). (4) Aggression → Disqualification (red + yellow separately).",
          "DELAY SANCTIONS work the same as indoor: first delay = warning (whole match), subsequent delays = penalty (point to opponent). All sanctions carry forward through the entire match."
        ],
        keyPoints: [
          "1 timeout per set (30 seconds)",
          "No substitutions at all",
          "Injured player = team is incomplete, loses",
          "Sanction scale same as indoor (Yellow → Red → cards)",
          "Court switch every 7 points (5 in deciding set)"
        ],
        ruleRef: "FIVB Beach Rules 15-20",
        diagram: "sanction-cards"
      }
    ]
  }
};

// Helper to get module by slug
export function getModuleBySlug(slug: string): Module | undefined {
  return moduleContent[slug.toLowerCase()];
}

// Get all modules as array for listing
export function getAllModules(): Module[] {
  return Object.values(moduleContent).sort((a, b) => a.chapter - b.chapter);
}

// Get modules filtered by category
export function getModulesByCategory(category: Module["category"]): Module[] {
  return Object.values(moduleContent)
    .filter(m => m.category === category)
    .sort((a, b) => a.chapter - b.chapter);
}

// Get next module for navigation
export function getNextModule(currentSlug: string): Module | undefined {
  const current = moduleContent[currentSlug.toLowerCase()];
  if (current?.nextModule) {
    return moduleContent[current.nextModule];
  }
  return undefined;
}

// Get module by chapter number
export function getModuleByChapter(chapter: number): Module | undefined {
  return Object.values(moduleContent).find(m => m.chapter === chapter);
}
