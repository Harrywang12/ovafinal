/** Run with npm run learn:infographics. Geometry is deterministic and reviewable. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { moduleContent } from "../lib/module-content";
import {
  learnInfographics,
  type LearnInfographic,
} from "../lib/learn-infographics";

const C = {
  ink: "#20231f",
  muted: "#5f615a",
  red: "#c8102e",
  blue: "#234f70",
  pale: "#e7eef3",
  green: "#176b50",
  gold: "#9c6810",
  line: "#d9d6d0",
  bg: "#f8f6f2",
};
const esc = (v: string | number) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill = "white",
  stroke = "none",
  rx = 0,
) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string = C.ink,
  width = 2,
  dash = "",
) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const text = (
  x: number,
  y: number,
  value: string | number,
  size = 20,
  color: string = C.ink,
  anchor = "middle",
  weight = 600,
) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
const circle = (
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke = "none",
) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
function wrapped(
  x: number,
  y: number,
  value: string,
  max = 32,
  size = 20,
  color: string = C.ink,
  anchor = "middle",
) {
  const words = value.split(/\s+/);
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    if (row && `${row} ${word}`.length > max) {
      rows.push(row);
      row = word;
    } else row += `${row ? " " : ""}${word}`;
  }
  if (row) rows.push(row);
  return rows
    .map((r, i) => text(x, y + i * (size + 7), r, size, color, anchor))
    .join("");
}
function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string = C.red,
  dashed = false,
) {
  return (
    line(x1, y1, x2, y2, color, 3, dashed ? "8 6" : "") +
    `<path d="M-10 -5 L0 0 L-10 5" transform="translate(${x2} ${y2}) rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI})" fill="none" stroke="${color}" stroke-width="3"/>`
  );
}
function player(
  x: number,
  y: number,
  value: string | number,
  color: string = C.red,
) {
  return circle(x, y, 19, color, "white") + text(x, y + 7, value, 21, "white");
}
function dimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  value: string,
) {
  const vertical = x1 === x2;
  return (
    line(x1, y1, x2, y2, C.muted, 1) +
    (vertical
      ? line(x1 - 5, y1, x1 + 5, y1, C.muted) +
        line(x2 - 5, y2, x2 + 5, y2, C.muted) +
        text(x1 - 12, (y1 + y2) / 2 + 6, value, 19, C.ink, "end")
      : line(x1, y1 - 5, x1, y1 + 5, C.muted) +
        line(x2, y2 - 5, x2, y2 + 5, C.muted) +
        text((x1 + x2) / 2, y1 + 26, value, 19))
  );
}
function fullCourt(id: string, zones = false, crew = false) {
  const beach = id.startsWith("beach");
  const four = id.startsWith("4v4");
  let s = rect(80, 100, 480, 240, beach ? "#eee0ba" : C.blue, "white");
  if (!beach && !four) {
    if (zones) s += rect(240, 100, 160, 240, "#f5d8dd");
    s +=
      line(240, 100, 240, 340, "white", 2) +
      line(400, 100, 400, 340, "white", 2);
  }
  // The net is perpendicular to the 18 m / 14 m / 16 m axis.
  s +=
    line(320, 90, 320, 350, C.red, 5) +
    circle(320, 90, 5, C.red) +
    circle(320, 350, 5, C.red);
  if (crew) {
    s += player(320, 55, "R1", C.ink) + player(320, 374, "R2", C.ink);
    s +=
      rect(242, 400, 156, 36, "white", C.line, 6) +
      text(320, 425, "Scorer", 19);
    s += player(58, 85, "LJ", C.green) + player(582, 355, "LJ", C.green);
    s +=
      text(167, 60, "R1 on stand", 20) +
      text(170, 399, "R2 at floor level", 19);
    return s;
  }
  if (zones) {
    s += rect(32, 100, 43, 240, "#dbece4") + rect(565, 100, 43, 240, "#dbece4");
    s +=
      rect(240, 347, 160, 24, "#f2bbc6") +
      rect(80, 347, 160, 24, "#f0deb8") +
      rect(400, 347, 160, 24, "#f0deb8");
    s +=
      text(160, 220, "Back", 22, "white") +
      text(280, 220, "Front", 20, C.ink) +
      text(360, 220, "Front", 20, C.ink) +
      text(480, 220, "Back", 22, "white");
    s +=
      text(54, 79, "Serve", 17, C.green) + text(586, 79, "Serve", 17, C.green);
    s +=
      text(160, 397, "Bench A", 19) +
      text(320, 397, "Scorer", 19) +
      text(480, 397, "Bench B", 19);
    s += text(320, 56, "NET", 18, C.red);
    return s;
  }
  if (four || beach) {
    const left = four
      ? [
          [142, 220],
          [204, 155],
          [264, 220],
          [204, 285],
        ]
      : [
          [176, 165],
          [224, 275],
        ];
    left.forEach(([x, y], i) => {
      s += player(x, y, beach ? i + 1 : "•");
      s += player(640 - x, 440 - y, beach ? i + 1 : "•", C.green);
    });
  } else {
    [4, 3, 2].forEach((n, i) => {
      s += player(280, 145 + i * 75, n);
    });
    [5, 6, 1].forEach((n, i) => {
      s += player(160, 145 + i * 75, n);
    });
    [2, 3, 4].forEach((n, i) => {
      s += player(360, 145 + i * 75, n, C.green);
    });
    [1, 6, 5].forEach((n, i) => {
      s += player(480, 145 + i * 75, n, C.green);
    });
  }
  s +=
    text(320, 58, "NET", 19, C.red) +
    dimension(80, 380, 560, 380, beach ? "16 m" : four ? "14 m" : "18 m") +
    dimension(52, 100, 52, 340, beach ? "8 m" : four ? "7 m" : "9 m");
  if (!beach && !four)
    s +=
      dimension(240, 72, 320, 72, "3 m") + dimension(320, 72, 400, 72, "3 m");
  return s;
}

// Half court, one team facing the net. Each half is square, with the attack line at 3 m.
const positions = [
  { n: 4, x: 180, y: 135 },
  { n: 3, x: 320, y: 135 },
  { n: 2, x: 460, y: 135 },
  { n: 5, x: 180, y: 295 },
  { n: 6, x: 320, y: 295 },
  { n: 1, x: 460, y: 295 },
];
function halfCourt(rotation = false, libero = false, tosser = false) {
  let s =
    rect(140, 55, 360, 360, C.blue, "white") +
    line(140, 175, 500, 175, "white", 2) +
    line(130, 55, 510, 55, C.red, 5) +
    text(320, 33, "NET", 19, C.red);
  if (libero)
    s +=
      rect(505, 175, 38, 240, "#f0deb8") +
      arrow(565, 305, 475, 305, C.gold) +
      arrow(475, 360, 565, 360, C.gold);
  if (rotation) {
    const points = [
      [460, 295],
      [320, 295],
      [180, 295],
      [180, 135],
      [320, 135],
      [460, 135],
      [460, 295],
    ];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i],
        [x2, y2] = points[i + 1];
      const d = Math.hypot(x2 - x1, y2 - y1);
      s += arrow(
        x1 + ((x2 - x1) * 28) / d,
        y1 + ((y2 - y1) * 28) / d,
        x2 - ((x2 - x1) * 28) / d,
        y2 - ((y2 - y1) * 28) / d,
        "#f6c867",
      );
    }
  }
  if (tosser)
    s +=
      arrow(70, 230, 155, 292, C.gold) +
      arrow(70, 230, 300, 292, C.gold, true) +
      player(65, 200, "T", C.gold);
  for (const p of positions)
    s += player(
      p.x,
      p.y,
      libero && p.n === 1 ? "L" : p.n,
      libero && p.n === 1 ? C.gold : C.red,
    );
  if (libero)
    s +=
      text(320, 225, "BACK ROW", 20, "white") +
      text(320, 390, "Replacement zone →", 18, "white");
  else if (!rotation && !tosser) s += text(320, 225, "BACK ROW", 20, "white");
  return s;
}
function sequence(labels: string[], values?: string[], badges?: string[]) {
  const count = labels.length;
  const gap = 20;
  const w = (560 - gap * (count - 1)) / count;
  let s = "";
  labels.forEach((label, i) => {
    const x = 40 + i * (w + gap);
    s +=
      rect(x, 100, w, 232, "white", C.line, 10) +
      circle(x + w / 2, 141, 23, i === 0 ? C.red : C.blue) +
      text(x + w / 2, 148, badges?.[i] ?? i + 1, 22, "white");
    s += wrapped(x + w / 2, 207, label, Math.floor(w / 12), 22);
    if (values?.[i])
      s += wrapped(x + w / 2, 282, values[i], Math.floor(w / 10), 18, C.muted);
    if (i < count - 1) s += arrow(x + w + 2, 245, x + w + gap - 3, 245, C.ink);
  });
  return s;
}
function flow(id: string, spec: LearnInfographic) {
  if (id === "team-leaders") {
    return rect(40, 40, 560, 160, "white", C.line, 8) +
      text(320, 80, "GAME CAPTAIN", 20, C.red) +
      text(160, 133, "Rule question", 23) +
      arrow(258, 126, 368, 126) + text(470, 133, "Referee", 23) +
      text(320, 176, "While the ball is out of play", 19, C.muted) +
      rect(40, 235, 560, 160, "white", C.line, 8) +
      text(320, 277, "COACH", 20, C.blue) +
      text(320, 326, "Lineup · substitutions · timeouts", 25) +
      text(320, 369, "Uses the authorized request procedure", 19, C.muted);
  }
  const flows: Record<string, string[]> = {
    "regular-interruptions": ["Rally ends", "Request", "Approval"],
    "exceptional-interruptions": ["Stop play", "Resolve cause", "Replay rally"],
    "libero-redesignation": [
      "Unavailable libero",
      "Eligible player",
      "Notify R2",
    ],
    sportsmanship: ["Player concern", "Game captain", "Referee"],
    scorers: ["Scorer", "Match record", "Assistant scorer"],
    "beach-interruptions-conduct": ["One timeout", "30 seconds", "Resume play"],
  };
  const values: Record<string, string[]> = {
    scorers: ["Points + order", "Cross-check", "Libero tracking"],
    "libero-redesignation": ["Cannot continue", "Off court", "Scorer records"],
  };
  if (!flows[id]) throw new Error(`Missing flow: ${id} (${spec.title})`);
  return sequence(flows[id], values[id]);
}
function jersey(x: number, y: number, n: string, fill: string, stripe = false) {
  return (
    `<path d="M${x + 35} ${y} L${x + 65} ${y} L${x + 95} ${y + 25} L${x + 78} ${y + 52} L${x + 70} ${y + 42} V${y + 142} H${x + 10} V${y + 42} L${x + 2} ${y + 52} L${x - 15} ${y + 25} Z" fill="${fill}"/>` +
    text(x + 40, y + 85, n, 40, "white") +
    (stripe ? rect(x + 23, y + 98, 34, 8, "white") : "")
  );
}
function official(x: number, y: number, arms: string) {
  return (
    circle(x, y, 13, C.ink) +
    line(x, y + 18, x, y + 67, C.ink, 10) +
    line(x, y + 66, x - 17, y + 101, C.ink, 7) +
    line(x, y + 66, x + 17, y + 101, C.ink, 7) +
    `<path d="${arms}" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}
function signals(flags = false) {
  const labels = flags
    ? [
        "Ball in",
        "Ball out",
        "Ball touched",
        "Fault: wave flag",
        "Judgment impossible",
      ]
    : [
        "Timeout: T hands",
        "Substitution",
        "Rotation fault",
        "Ball in: point down",
        "Ball out: palms in",
        "End of set / match",
      ];
  let s = "";
  labels.forEach((label, i) => {
    const x = 20 + (i % 3) * 204,
      y = 12 + Math.floor(i / 3) * 210,
      cx = x + 98,
      cy = y + 42;
    s += rect(x, y, 192, 194, "white", C.line, 8);
    let arms = "";
    if (flags) {
      if (i === 0) arms = `M${cx} ${cy + 26} L${cx + 35} ${cy + 67}`;
      if (i === 1 || i === 2 || i === 3)
        arms = `M${cx} ${cy + 26} L${cx + 32} ${cy - 10}`;
      if (i === 2)
        arms += ` M${cx} ${cy + 26} L${cx + 10} ${cy - 22} L${cx + 45} ${cy - 22}`;
      if (i === 4)
        arms = `M${cx - 35} ${cy + 14} L${cx + 28} ${cy + 52} M${cx + 35} ${cy + 14} L${cx - 28} ${cy + 52}`;
      s += official(cx, cy, arms);
      if (i < 4) {
        const fx = cx + 35,
          fy = i === 0 ? cy + 67 : cy - 14;
        s +=
          line(fx, fy, fx, fy + (i === 0 ? 26 : -24), C.ink, 3) +
          rect(fx, fy + (i === 0 ? 12 : -24), 23, 15, C.red);
        if (i === 3)
          s +=
            arrow(cx - 28, cy - 15, cx + 15, cy - 15, C.red) +
            arrow(cx + 15, cy - 32, cx - 28, cy - 32, C.red);
      }
    } else {
      if (i === 0)
        arms = `M${cx} ${cy + 26} L${cx + 32} ${cy + 26} L${cx + 32} ${cy - 12} M${cx} ${cy + 26} L${cx - 20} ${cy + 10} L${cx + 10} ${cy - 18} L${cx + 55} ${cy - 18}`;
      if (i === 1)
        arms = `M${cx - 2} ${cy + 26} L${cx - 32} ${cy + 40} L${cx - 32} ${cy + 14} M${cx + 2} ${cy + 26} L${cx + 32} ${cy + 40} L${cx + 32} ${cy + 14}`;
      if (i === 2)
        arms = `M${cx} ${cy + 26} L${cx + 30} ${cy + 26} L${cx + 30} ${cy - 8}`;
      if (i === 3) arms = `M${cx} ${cy + 26} L${cx + 32} ${cy + 66}`;
      if (i === 4)
        arms = `M${cx} ${cy + 26} L${cx - 32} ${cy + 26} L${cx - 32} ${cy - 12} M${cx} ${cy + 26} L${cx + 32} ${cy + 26} L${cx + 32} ${cy - 12}`;
      if (i === 5)
        arms = `M${cx - 36} ${cy + 10} L${cx + 30} ${cy + 49} M${cx + 36} ${cy + 10} L${cx - 30} ${cy + 49}`;
      s += official(cx, cy, arms);
      if (i === 1 || i === 2)
        s +=
          `<path d="M${cx + 48} ${cy + 1} a17 17 0 1 1 -22 -12" fill="none" stroke="${C.red}" stroke-width="3"/>` +
          arrow(cx + 26, cy - 11, cx + 34, cy - 12, C.red);
    }
    s += wrapped(x + 96, y + 162, label, 18, 17);
  });
  return s;
}
function sheet(id: string) {
  let s =
    rect(30, 32, 580, 376, "white", C.line, 8) +
    text(55, 68, "TEACHING EXTRACT", 17, C.red, "start") +
    line(50, 85, 590, 85, C.line);
  if (id === "before-match") {
    const rows = [
      ["MATCH", "Event · date · venue"],
      ["TEAMS", "Team A / Team B"],
      ["ROSTER", "Numbers · captain · libero"],
      ["APPROVAL", "Officials · signatures"],
    ];
    rows.forEach(([a, b], i) => {
      const y = 125 + i * 72;
      s +=
        text(56, y, a, 18, C.muted, "start") +
        text(56, y + 27, b, 22, C.ink, "start") +
        line(55, y + 42, 585, y + 42, C.line, 1);
    });
  } else if (id === "after-toss") {
    s +=
      text(170, 124, "A · SERVE (S)", 24, C.red) +
      text(470, 124, "B · RECEIVE (R)", 24, C.blue);
    s += text(320, 177, "LINEUP POSITIONS", 18, C.muted);
    ["I", "II", "III", "IV", "V", "VI"].forEach((n, i) => {
      const x = 60 + i * 88;
      s +=
        rect(x, 200, 80, 50, C.pale, C.line) +
        text(x + 40, 232, n, 24) +
        rect(x, 250, 80, 60, "white", C.line) +
        text(x + 40, 289, [7, 12, 3, 8, 10, 5][i], 24);
    });
    s += text(320, 360, "Example jersey numbers in slots I–VI", 20);
  } else if (id === "recording-points") {
    s += text(320, 130, "A: 3–3 → 4–3 → 5–3 → 5–4", 25);
    for (let i = 1; i <= 6; i++) {
      const x = 65 + (i - 1) * 87;
      s +=
        rect(x, 172, 75, 60, i <= 5 ? C.pale : "white", C.line) +
        text(x + 37, 212, i, 25);
      if (i <= 5) s += line(x + 16, 224, x + 58, 180, C.red, 3);
    }
    s +=
      text(67, 286, "Service starts", 20, C.muted, "start") +
      text(405, 286, "Service lost", 20, C.muted, "start");
    s +=
      text(150, 341, "✓", 40, C.green) +
      arrow(235, 328, 385, 328) +
      rect(424, 307, 90, 56, C.pale, C.line) +
      text(469, 345, "5", 30);
    s += text(320, 391, "Exit score = team A’s running total", 19);
  } else if (id === "deciding-set") {
    s += text(320, 133, "8–6", 54, C.red) + text(320, 171, "CHANGE COURTS", 21);
    s +=
      rect(70, 207, 220, 90, C.pale, C.line) +
      text(180, 239, "POINTS AT CHANGE", 17) +
      text(180, 278, "8", 32) +
      arrow(308, 252, 358, 252) +
      rect(380, 207, 190, 90, "white", C.line) +
      text(475, 241, "CONTINUE", 18) +
      text(475, 278, "8–6", 30);
    s += text(320, 359, "Target 15 · win by two", 24);
  } else if (id === "substitutions-timeouts") {
    s += text(177, 130, "SUBSTITUTION", 21) + text(465, 130, "TIMEOUTS", 21);
    s +=
      rect(72, 155, 210, 80, C.pale, C.line) +
      text(177, 185, "Starter 7", 23) +
      text(177, 218, "Substitute 12", 23) +
      text(177, 279, "Score: 10–8", 25, C.red);
    s +=
      rect(365, 155, 200, 62, "white", C.line) +
      text(465, 195, "1: 14–12", 24) +
      rect(365, 230, 200, 62, "white", C.line) +
      text(465, 270, "2: 19–20", 24);
    s += text(320, 362, "Record the score at each request", 21);
  } else if (id === "sanctions-recording") {
    const labels = ["W", "P", "E", "D", "Team", "Set", "Score"],
      values = ["", "7", "", "", "A", "2", "10–8"];
    labels.forEach((n, i) => {
      const w = i === 6 ? 116 : 70;
      const x = 50 + i * 70;
      s +=
        rect(x, 155, w, 58, C.pale, C.line) +
        text(x + w / 2, 193, n, 22) +
        rect(x, 213, w, 65, "white", C.line) +
        text(x + w / 2, 256, values[i], 24, i === 1 ? C.red : C.ink);
    });
    s +=
      text(320, 331, "Example: penalty to player #7", 23, C.red) +
      text(320, 371, "Record opponent’s penalty point too", 20);
  } else if (id === "after-match") {
    s += text(320, 129, "RESULT: A wins 2–0", 29, C.red);
    [
      ["Set 1", "25–18"],
      ["Set 2", "25–21"],
    ].forEach(([a, b], i) => {
      s +=
        text(100, 183 + i * 45, a, 23, C.muted, "start") +
        text(500, 183 + i * 45, b, 26);
    });
    s +=
      line(65, 254, 575, 254, C.line) +
      text(320, 291, "Totals → verify → signatures", 23) +
      line(75, 357, 270, 357, C.muted, 1) +
      line(370, 357, 565, 357, C.muted, 1) +
      text(172, 386, "Captains", 18) +
      text(468, 386, "Officials", 18);
  } else throw new Error(`Missing sheet ${id}`);
  return s;
}
function draw(id: string, spec: LearnInfographic): string {
  switch (spec.kind) {
    case "court":
      return fullCourt(id);
    case "zones":
      return fullCourt(id, true);
    case "crew":
      return fullCourt(id, false, true);
    case "rotation":
      return halfCourt(id === "positions-rotation");
    case "libero":
      return halfCourt(false, true);
    case "tosser":
      return halfCourt(false, false, true);
    case "flow":
      return flow(id, spec);
    case "sheet":
      return sheet(id);
    case "flags":
      return signals(true);
    case "signals":
      return signals();
    case "net": {
      let s =
        rect(105, 180, 430, 45, C.pale, C.blue) +
        line(82, 175, 82, 290, C.ink, 7) +
        line(558, 175, 558, 290, C.ink, 7) +
        line(40, 290, 600, 290, C.muted);
      for (let x = 110; x < 535; x += 10)
        s += line(x, 180, x, 225, "#9baebc", 1);
      for (let y = 190; y < 225; y += 10)
        s += line(105, y, 535, y, "#9baebc", 1);
      s += rect(105, 177, 430, 4, "white", C.line);
      for (const x of [125, 515]) {
        s += line(x, 144, x, 225, C.red, 3);
        for (let y = 144; y < 180; y += 10)
          s += line(x, y, x, y + 5, "white", 3);
      }
      s +=
        dimension(105, 60, 535, 60, "Net length 9.50–10 m") +
        dimension(592, 180, 592, 225, "1 m") +
        text(320, 120, "Antenna: 80 cm above net", 20, C.red) +
        text(320, 343, "2.43 m men / 2.24 m women", 25) +
        text(320, 398, "Post offset: 0.50–1.00 m from sideline", 20);
      return s;
    }
    case "ball":
      return (
        circle(320, 210, 118, "white", C.blue) +
        `<path d="M220 145 Q350 190 420 280 M210 250 Q310 130 420 180 M280 99 Q240 250 362 320" fill="none" stroke="${C.red}" stroke-width="6"/>` +
        text(320, 51, "65–67 cm circumference", 25) +
        text(320, 380, "260–280 g", 29) +
        text(320, 418, "4.26–4.61 psi", 23, C.muted)
      );
    case "uniforms": {
      const beach = id.startsWith("beach");
      return (
        jersey(170, 95, beach ? "1" : "7", C.red, !beach) +
        jersey(385, 95, beach ? "2" : "12", beach ? C.red : C.blue) +
        text(210, 287, "Captain", 24) +
        text(425, 287, beach ? "Teammate" : "Libero", 24) +
        text(
          320,
          349,
          beach ? "2 players · no substitutions" : "Captain stripe: 8 × 2 cm",
          25,
        ) +
        text(
          320,
          392,
          beach
            ? "Jersey numbers 1 and 2"
            : "Libero: contrasting dominant colour",
          20,
          C.muted,
        )
      );
    }
    case "scoring": {
      const beach = id.startsWith("beach");
      return (
        sequence(
          [beach ? "21 points" : "25 points", "15 points", "2-point lead"],
          [
            beach ? "Sets 1 and 2" : "Regular set",
            "Deciding set",
            "Required in every set",
          ],
        ) +
        text(
          320,
          392,
          beach
            ? "Court switches: every 7 / 5 combined points"
            : "Rally winner: +1 point",
          23,
          C.red,
        )
      );
    }
    case "overlap": {
      let s = "";
      [false, true].forEach((fault, i) => {
        const x = 35 + i * 305;
        s +=
          rect(x, 48, 265, 305, C.pale, C.line, 8) +
          line(x + 15, 83, x + 250, 83, C.red, 4) +
          text(x + 132, 73, "NET", 18, C.red) +
          player(x + 132, 175, 3, C.blue) +
          player(x + 132, fault ? 128 : 285, 6, fault ? C.red : C.green) +
          text(
            x + 132,
            386,
            fault ? "FAULT: 6 ahead of 3" : "LEGAL: 6 behind 3",
            19,
            fault ? C.red : C.green,
          );
      });
      return s;
    }
    case "boundary": {
      let s = "";
      [false, true].forEach((out, i) => {
        const x = 40 + i * 305;
        s +=
          rect(x, 65, 255, 275, C.blue, C.line, 8) +
          rect(x + 130, 65, 125, 275, C.bg) +
          rect(x + 120, 65, 10, 275, "white") +
          circle(x + (out ? 176 : 126), 210, 26, "#f1ce6e", C.ink) +
          text(x + 128, 386, out ? "OUT" : "IN", 30, out ? C.red : C.green);
      });
      return s;
    }
    case "contacts":
      return (
        sequence(
          ["Pass", "Set", "Attack"],
          ["Contact 1", "Contact 2", "Contact 3"],
        ) + text(320, 393, "Indoor block is not a team hit", 23, C.red)
      );
    case "block":
      return (
        sequence(
          ["Block", "Three hits", "Return"],
          ["Not a team hit", "1 → 2 → 3", "Across the net"],
          ["B", "1–3", "→"],
        ) + text(320, 393, "Only front-row players complete a block", 22, C.red)
      );
    case "beach-contacts":
      return (
        sequence(
          ["Block = 1", "Contact 2", "Contact 3"],
          ["Counts as a hit", "Two remain", "Return the ball"],
        ) +
        text(320, 393, "Beach: maximum three, including the block", 22, C.red)
      );
    case "crossing": {
      let s =
        rect(145, 185, 350, 160, C.pale, C.line) +
        rect(145, 55, 350, 130, "#dfede6") +
        line(145, 185, 495, 185, C.blue, 7) +
        line(145, 45, 145, 345, C.red, 5) +
        line(495, 45, 495, 345, C.red, 5);
      s +=
        text(320, 96, "CROSSING SPACE", 24, C.green) +
        text(320, 132, "Above net · between antennas", 19, C.green) +
        circle(320, 161, 13, C.gold) +
        text(320, 270, "NET", 25, C.blue) +
        text(320, 403, "Under-net space: no completed crossing", 21, C.red) +
        text(80, 214, "OUT", 20, C.red) +
        text(559, 214, "OUT", 20, C.red);
      return s;
    }
    case "centre-line": {
      let s = "";
      [false, true].forEach((fault, i) => {
        const x = 40 + i * 305;
        s +=
          rect(x, 60, 255, 280, C.pale, C.line) +
          rect(x, 60, 255, 140, "#f5d8dd") +
          line(x, 200, x + 255, 200, C.ink, 4) +
          rect(
            x + 109,
            fault ? 110 : 165,
            38,
            fault ? 78 : 100,
            fault ? C.red : C.green,
            "white",
            17,
          ) +
          text(x + 127, 92, "Opponent", 20) +
          text(x + 127, 310, "Own court", 20) +
          text(
            x + 127,
            386,
            fault ? "Entire foot over: fault" : "Touches line: permitted",
            19,
            fault ? C.red : C.green,
          );
      });
      return s;
    }
    case "service": {
      const beach = id.startsWith("beach");
      let s =
        rect(160, 50, 320, 320, beach ? "#eee0ba" : C.blue, "white") +
        rect(160, 375, 320, 45, "#e0ede6") +
        line(160, 50, 480, 50, C.red, 4) +
        line(160, 375, 160, 420, C.green, 2, "7 7") +
        line(480, 375, 480, 420, C.green, 2, "7 7");
      s +=
        player(420, 400, "S", C.green) +
        arrow(420, 375, 420, 100, beach ? C.green : "#f6c867") +
        text(320, 434, "SERVICE ZONE", 19, C.green) +
        text(320, 350, "END LINE", 20, beach ? C.ink : "white") +
        text(320, 28, "NET", 19, C.red);
      if (beach) s += player(230, 170, "P", C.red);
      else
        s +=
          circle(245, 368, 18, C.red, "white") +
          text(245, 408, "Foot fault", 18, C.red);
      return s;
    }
    case "attack": {
      let s =
        line(55, 340, 590, 340, C.ink, 3) +
        line(355, 95, 355, 340, C.red, 4) +
        line(535, 95, 535, 340, C.blue, 5) +
        line(355, 175, 535, 175, C.muted, 2, "7 7");
      s +=
        text(355, 69, "Attack line", 21, C.red) +
        text(535, 69, "Net", 21, C.blue) +
        player(210, 310, "B", C.green) +
        player(430, 310, "B", C.green) +
        `<path d="M210 280 Q270 105 430 280" fill="none" stroke="${C.green}" stroke-width="3" stroke-dasharray="8 6"/>` +
        circle(315, 155, 12, C.gold) +
        arrow(330, 150, 575, 150, C.red) +
        dimension(355, 378, 535, 378, "3 m") +
        text(167, 391, "Takeoff", 22, C.green) +
        text(440, 365, "Landing", 20, C.green);
      return s;
    }
    case "substitution":
      return (
        player(165, 170, 7, C.red) +
        player(475, 170, 12, C.blue) +
        arrow(205, 150, 435, 150, C.red) +
        arrow(435, 195, 205, 195, C.blue) +
        text(165, 241, "Starter", 25) +
        text(475, 241, "Substitute", 25) +
        text(320, 310, "Same lineup position", 27) +
        text(320, 365, "7 out → 12 in → 7 returns", 23, C.muted)
      );
    case "delay": {
      let s = "";
      [false, true].forEach((penalty, i) => {
        const x = 45 + i * 305;
        s +=
          rect(x, 55, 245, 280, "white", C.line, 8) +
          line(x + 35, 230, x + 195, 230, C.ink, 17) +
          rect(x + 105, 115, 55, 92, penalty ? C.red : "#f4c743", C.ink, 3) +
          line(x + 112, 213, x + 112, 247, C.ink, 5) +
          text(x + 122, 292, penalty ? "RED AT WRIST" : "YELLOW AT WRIST", 17) +
          text(
            x + 122,
            376,
            penalty ? "Penalty: point + serve" : "Warning: no point",
            20,
            penalty ? C.red : C.ink,
          );
      });
      return s;
    }
    case "sanctions": {
      const labels = ["Warning", "Penalty", "Expulsion", "Disqualification"],
        details = [
          "No point",
          "Point + service",
          "Rest of set",
          "Rest of match",
        ];
      let s = "";
      labels.forEach((label, i) => {
        const x = 22 + (i % 2) * 310,
          y = 18 + Math.floor(i / 2) * 210;
        s += rect(x, y, 286, 194, "white", C.line, 8);
        const cx = x + 143;
        if (i < 2)
          s += rect(
            cx - 25,
            y + 20,
            50,
            75,
            i === 0 ? "#f4c743" : C.red,
            C.ink,
            3,
          );
        else if (i === 2)
          s +=
            rect(cx - 39, y + 20, 50, 75, "#f4c743", C.ink, 3) +
            rect(cx - 11, y + 20, 50, 75, C.red, C.ink, 3);
        else
          s +=
            rect(cx - 70, y + 20, 50, 75, "#f4c743", C.ink, 3) +
            rect(cx + 20, y + 20, 50, 75, C.red, C.ink, 3);
        s +=
          text(cx, y + 132, label, 22) +
          text(cx, y + 169, details[i], 20, C.muted);
      });
      return s;
    }
    case "formations": {
      let s = "";
      [false, true].forEach((square, i) => {
        const x = 35 + i * 305;
        s +=
          rect(x, 65, 265, 265, C.blue, "white") +
          line(x, 65, x + 265, 65, C.red, 4) +
          text(x + 132, 42, "NET", 18, C.red);
        const p = square
          ? [
              [75, 70, "F"],
              [190, 70, "F"],
              [75, 205, "B"],
              [190, 205, "B"],
            ]
          : [
              [132, 50, "F"],
              [65, 135, "B"],
              [200, 135, "B"],
              [132, 220, "B"],
            ];
        p.forEach(([px, py, n]) => {
          s += player(x + Number(px), 65 + Number(py), String(n));
        });
        s += text(x + 132, 386, square ? "Square" : "Diamond", 26);
      });
      return s;
    }
    case "tripleball":
      return (
        sequence(
          ["A serves to B", "Free ball to B", "Free ball to A"],
          ["Rally 1", "Rally 2", "Rally 3"],
        ) +
        text(
          320,
          391,
          "Finish the sequence before rotating / changing",
          21,
          C.red,
        )
      );
    case "reception":
      return (
        sequence(
          ["Served ball", "Forearm pass", "Continue"],
          ["Overhand = fault", "Required reception", "Tossed ball: re-toss"],
        ) +
        text(320, 395, "Overhand tossed-ball reception → re-toss", 21, C.red)
      );
  }
}

export function renderInfographic(id: string, spec: LearnInfographic) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440" role="img" aria-labelledby="title desc"><title id="title">${esc(spec.title)}</title><desc id="desc">${esc([spec.caption, ...spec.notes].join(" "))}</desc><rect width="640" height="440" fill="${C.bg}"/><g font-family="Arial, sans-serif">${draw(id, spec)}</g></svg>\n`;
}
async function main() {
  const lessons = Object.values(moduleContent).flatMap((m) => m.lessons);
  const expected = new Set(lessons.map((l) => l.id));
  if (expected.size !== lessons.length)
    throw new Error("Lesson IDs must be unique");
  const missing = lessons.filter((l) => !learnInfographics[l.id]);
  const stale = Object.keys(learnInfographics).filter(
    (id) => !expected.has(id),
  );
  if (missing.length || stale.length)
    throw new Error(
      `Registry mismatch. Missing: ${missing.map((l) => l.id)}. Stale: ${stale}`,
    );
  const dir = resolve("public/images/learn");
  await mkdir(dir, { recursive: true });
  for (const lesson of lessons)
    await writeFile(
      resolve(dir, `${lesson.id}.svg`),
      renderInfographic(lesson.id, learnInfographics[lesson.id]),
    );
  console.log(
    `Generated ${lessons.length} lesson-specific SVG infographics in ${dir}`,
  );
}
// Importable for focused geometry and coverage tests.
if (process.argv[1]?.endsWith("generate-learn-infographics.ts"))
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
