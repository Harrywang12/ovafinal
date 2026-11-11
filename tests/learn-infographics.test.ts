import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { moduleContent } from "../lib/module-content";
import { infographicPath, learnInfographics } from "../lib/learn-infographics";

const lessons = Object.values(moduleContent).flatMap(
  (module) => module.lessons,
);
const svg = (id: string) =>
  readFileSync(`public${infographicPath(id)}`, "utf8");

describe("Learn infographic coverage and court rules", () => {
  it("provides a unique, accessible asset for every lesson, with no generic fallback", () => {
    expect(Object.keys(learnInfographics).sort()).toEqual(
      lessons.map((lesson) => lesson.id).sort(),
    );
    for (const lesson of lessons) {
      expect(existsSync(`public${infographicPath(lesson.id)}`), lesson.id).toBe(
        true,
      );
      expect(svg(lesson.id), lesson.id).toContain('<title id="title">');
      expect(svg(lesson.id), lesson.id).toContain('<desc id="desc">');
      expect(learnInfographics[lesson.id].caption.length).toBeGreaterThan(40);
    }
  });

  it("draws an 18 by 9 court with its net across the short axis and attack lines 3 m away", () => {
    const court = svg("playing-area");
    expect(court).toContain('x="80" y="100" width="480" height="240"');
    expect(court).toContain('x1="320" y1="90" x2="320" y2="350"');
    // At this scale 3 metres is 80 pixels, measured along the court's length.
    expect(court).toContain('x1="240" y1="100" x2="240" y2="340"');
    expect(court).toContain('x1="400" y1="100" x2="400" y2="340"');
  });

  it("numbers both teams from their own perspective facing the net", () => {
    const court = svg("playing-area");
    for (const [x, numbers] of [
      [280, [4, 3, 2]],
      [160, [5, 6, 1]],
      [360, [2, 3, 4]],
      [480, [1, 6, 5]],
    ] as const) {
      numbers.forEach((number, index) => {
        expect(court).toMatch(
          new RegExp(
            `<text x="${x}" y="${152 + index * 75}"[^>]*>${number}</text>`,
          ),
        );
      });
    }
  });

  it("uses the same correct positions for rotation, libero and tosser lessons", () => {
    for (const id of [
      "positions-rotation",
      "6v6-serving-reception",
      "libero-complete",
      "6v6-free-ball-tosser",
    ]) {
      const court = svg(id);
      expect(court).toMatch(/<text x="180" y="142"[^>]*>4<\/text>/);
      expect(court).toMatch(/<text x="320" y="142"[^>]*>3<\/text>/);
      expect(court).toMatch(/<text x="460" y="142"[^>]*>2<\/text>/);
      expect(court).toMatch(
        new RegExp(
          `<text x="460" y="302"[^>]*>${id === "libero-complete" ? "L" : "1"}</text>`,
        ),
      );
    }
    expect(learnInfographics["positions-rotation"].notes[0]).toContain(
      "1 → 6 → 5 → 4 → 3 → 2 → 1",
    );
  });

  it("omits indoor attack lines from beach and 4v4 courts", () => {
    for (const id of ["beach-court-equipment", "4v4-court-equipment"]) {
      expect(svg(id)).not.toContain('x1="240" y1="100" x2="240" y2="340"');
      expect(svg(id)).not.toContain('x1="400" y1="100" x2="400" y2="340"');
    }
  });

  it("distinguishes the indoor and beach block contact counts", () => {
    expect(svg("blocking")).toContain("Not a team hit");
    expect(svg("beach-ball-handling")).toContain("Counts as a hit");
    expect(learnInfographics["game-delays"].kind).toBe("delay");
    expect(learnInfographics["sanctions-recording"].kind).toBe("sheet");
  });
});
