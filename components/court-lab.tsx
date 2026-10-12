"use client";

import { useState } from "react";
import { RotateCw, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";

const positions = [{ x: 345, y: 232 }, { x: 345, y: 127 }, { x: 240, y: 127 }, { x: 135, y: 127 }, { x: 135, y: 232 }, { x: 240, y: 232 }];

export function CourtLab() {
  const [rotation, setRotation] = useState(0);
  const [view, setView] = useState<"rotation" | "line">("rotation");
  const [touchesLine, setTouchesLine] = useState(true);
  return (
    <div className="court-lab">
      <div className="court-lab-top"><span className="eyebrow">The rotation lab</span><span className="diagram-status"><span /> Interactive preview</span></div>
      <div className="court-view-tabs" role="group" aria-label="Choose a court diagram"><button type="button" aria-pressed={view === "rotation"} onClick={() => setView("rotation")}>Rotations</button><button type="button" aria-pressed={view === "line"} onClick={() => setView("line")}>Line calls</button></div>
      {view === "rotation" ? <><svg viewBox="0 0 480 350" role="img" aria-labelledby="court-title court-desc" className="rotation-court">
        <title id="court-title">Volleyball rotational order</title>
        <desc id="court-desc">Six numbered players move clockwise through positions one to six. Position one is back right. The net is at the top. Select Rotate team to see the next rotation.</desc>
        <defs><marker id="rotation-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c8102e" /></marker></defs>
        <rect x="75" y="65" width="330" height="215" fill="#f6f2ed" stroke="#c7c2bb" strokeWidth="2" />
        <rect x="75" y="65" width="330" height="92" fill="#e8e2d9" />
        <path d="M75 157H405 M75 65H405" stroke="#c7c2bb" strokeWidth="2" />
        <path d="M65 60H415 M65 66H415" stroke="#20231f" strokeWidth="2" />
        <text x="240" y="40" textAnchor="middle" className="court-label">NET / FRONT ROW</text>
        <text x="240" y="311" textAnchor="middle" className="court-label">BACK ROW</text>
        <path d="M345 170V189 M285 127H302 M178 127H192 M135 188V173 M193 232H178 M301 232H285" fill="none" stroke="#c8102e" strokeWidth="2" markerEnd="url(#rotation-arrow)" />
        {positions.map((position, i) => {
          const number = ((i + rotation) % 6) + 1;
          return <g key={i}><circle cx={position.x} cy={position.y} r="25" fill={number === 1 ? "#c8102e" : "#fff"} stroke={number === 1 ? "#c8102e" : "#20231f"} strokeWidth="1.5" /><text x={position.x} y={position.y + 6} textAnchor="middle" fill={number === 1 ? "#fff" : "#20231f"} fontSize="18" fontWeight="700">{number}</text></g>;
        })}
        <text x="433" y="240" className="court-label" textAnchor="middle">1</text><text x="433" y="256" className="court-label" textAnchor="middle">ZONE</text>
      </svg>
      <div className="court-lab-controls"><span aria-live="polite">Rotation {rotation + 1} of 6</span><button type="button" onClick={() => setRotation((value) => (value + 1) % 6)}><RotateCw size={16} /> Rotate team</button></div>
      <div className="court-note"><Check size={18} /><p>Win the right to serve. Rotate one position clockwise. Player 1 is highlighted so you can follow the movement.</p></div>
      </> : <>
        <svg viewBox="0 0 480 350" role="img" aria-labelledby="line-title line-desc" className="rotation-court">
          <title id="line-title">Boundary line call: {touchesLine ? "ball in" : "ball out"}</title>
          <desc id="line-desc">An enlarged view of a volleyball boundary. A ball is in when any part touches the boundary line. Toggle the landing to compare a ball on the line with a ball outside it.</desc>
          <rect x="50" y="55" width="380" height="235" fill="#e8e2d9" />
          <rect x="50" y="230" width="380" height="60" fill="#f6f2ed" />
          <path d="M50 230H430" stroke="white" strokeWidth="10" />
          <text x="240" y="90" textAnchor="middle" className="court-label">INSIDE THE COURT</text>
          <text x="240" y="322" textAnchor="middle" className="court-label">OUTSIDE THE COURT</text>
          <circle cx="240" cy={touchesLine ? 211 : 264} r="23" fill="#c8102e" stroke="#20231f" strokeWidth="1.5" />
          <path d={touchesLine ? "M224 200Q240 220 256 200 M224 216Q240 196 256 216" : "M224 253Q240 273 256 253 M224 269Q240 249 256 269"} fill="none" stroke="white" strokeWidth="2" />
          <text x="345" y="204" textAnchor="middle" fontSize="16" fontWeight="700" fill="#20231f">{touchesLine ? "BALL IN" : "BALL OUT"}</text>
          <text x="345" y="225" textAnchor="middle" className="court-label">{touchesLine ? "TOUCHES THE LINE" : "CLEAR OF THE LINE"}</text>
        </svg>
        <div className="court-lab-controls"><span aria-live="polite">{touchesLine ? "On the line → ball in" : "Outside the line → ball out"}</span><button type="button" onClick={() => setTouchesLine((value) => !value)}><RotateCw size={16} /> Move the ball</button></div>
        <div className="court-note"><Check size={18} /><p>The line is part of the court. If any part of the ball touches it, the ball is in. Compare the two landings to see the difference.</p></div>
      </>}
      <Link href="/learn" className="text-link">Explore the learning modules <ArrowUpRight size={18} /></Link>
    </div>
  );
}
