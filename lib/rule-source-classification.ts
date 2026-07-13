export const RULESET_VALUES = [
  "standard_indoor",
  "beach",
  "rallyball_4v4",
  "rallyball_6v6",
  "rallyball_unspecified",
  "indoor_variation",
] as const;

export type RuleSet = (typeof RULESET_VALUES)[number];

const RALLYBALL_PATTERN = /\b(?:rallyball|tripleball|three[- ]ball sequence|tossed ball|tosser|free ball (?:is )?(?:introduced|tossed))\b/i;
const FOUR_V_FOUR_PATTERN = /\b(?:4v4|4 v 4|four[- ]a[- ]side|diamond formation)\b/i;
const SIX_V_SIX_PATTERN = /\b(?:6v6|6 v 6|six[- ]a[- ]side|designated setter position)\b/i;
const INDOOR_VARIATION_PATTERN = /\b(?:coed|reverse coed|recreational variation|snow volleyball|sitting volleyball)\b/i;

export function classifyRuleChunk(text: string, discipline: "indoor" | "beach"): RuleSet {
  if (discipline === "beach") return "beach";
  if (RALLYBALL_PATTERN.test(text)) {
    if (FOUR_V_FOUR_PATTERN.test(text)) return "rallyball_4v4";
    if (SIX_V_SIX_PATTERN.test(text)) return "rallyball_6v6";
    return "rallyball_unspecified";
  }
  if (INDOOR_VARIATION_PATTERN.test(text)) return "indoor_variation";
  return "standard_indoor";
}

export function containsRallyballContent(text: string) {
  return RALLYBALL_PATTERN.test(text);
}
