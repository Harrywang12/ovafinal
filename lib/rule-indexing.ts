import { createHash } from "crypto";
import pdf from "pdf-parse";
import { classifyRuleChunk, type RuleSet } from "./rule-source-classification";

export type PdfRulePage = { pageNumber: number; text: string };

export type IndexedRuleChunk = {
  chunkText: string;
  pageNumber: number;
  ruleNumber: string | null;
  sectionTitle: string | null;
  caseNumber: string | null;
  topic: string | null;
  topicTags: string[];
  ruleset: RuleSet;
  contentHash: string;
};

const RULE_LINE = /^(\d{1,2}(?:\.\d+){0,4})\.?\s+(.{3,})$/;
const PAGE_NOISE = /^(?:-?\s*\d+\s*-?|official (?:beach )?volleyball rules.*|volleyball canada.*)$/i;

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeTopLevelRule(number: string, title: string) {
  if (number.includes(".")) return true;
  const letters = title.replace(/[^a-z]/gi, "");
  if (!letters) return false;
  const uppercase = title.replace(/[^A-Z]/g, "").length;
  return uppercase / letters.length >= 0.6;
}

function ruleHeading(line: string) {
  const match = cleanLine(line).match(RULE_LINE);
  if (!match || !looksLikeTopLevelRule(match[1], match[2])) return null;
  return { ruleNumber: match[1], title: match[2].trim() };
}

function primaryTopicForRule(ruleNumber: string, discipline: "indoor" | "beach") {
  const top = Number(ruleNumber.split(".")[0]);
  if (top >= 1 && top <= 3) return "playing_area_and_equipment";
  if (top >= 4 && top <= 5) return "team_composition";
  if (top === 7) return "rotations_and_positioning";
  if (top === 12) return "service_and_service_order";
  if ((top >= 6 && top <= 14) || top === 19) return "playing_actions";
  if (top >= 15 && top <= 18) return "interruptions";
  if (discipline === "indoor" ? top >= 20 && top <= 21 : top >= 19 && top <= 20) return "misconduct";
  if (discipline === "indoor" ? top >= 22 && top <= 30 : top >= 21 && top <= 29) return "signals_and_procedures";
  return null;
}

export function topicTagsForRule(
  ruleNumber: string | null,
  discipline: "indoor" | "beach",
  ruleset: RuleSet,
  text = ""
) {
  if (!ruleNumber || !["standard_indoor", "beach"].includes(ruleset)) return [];
  const top = Number(ruleNumber.split(".")[0]);
  const tags = new Set<string>(["basic_case_scenario", "applied_case_scenario"]);
  const primary = primaryTopicForRule(ruleNumber, discipline);
  if (primary) tags.add(primary);

  const firstRefereeRule = discipline === "indoor" ? 23 : 22;
  const secondRefereeRule = discipline === "indoor" ? 24 : 23;
  const refereeStart = discipline === "indoor" ? 22 : 21;
  const refereeEnd = discipline === "indoor" ? 30 : 29;

  if (top === firstRefereeRule) tags.add("first_referee_authority");
  if (top === secondRefereeRule) tags.add("second_referee_responsibilities");
  if (top >= refereeStart && top <= refereeEnd) {
    tags.add(discipline === "indoor" ? "crew_cooperation" : "positioning_and_cooperation");
    tags.add(discipline === "indoor" ? "signals_and_procedures" : "communication_and_signals");
  }
  if ((top >= 5 && top <= 7) || (top >= 15 && top <= secondRefereeRule)) tags.add("match_management");
  if (/position|rotation|line-?up/i.test(text)) tags.add("rotations_and_positioning");
  return Array.from(tags);
}

function chunkWords(text: string, minWords = 90, maxWords = 330) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [text.trim()];
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += maxWords - 25) {
    const part = words.slice(index, index + maxWords).join(" ").trim();
    if (part.split(/\s+/).length < minWords && chunks.length) chunks[chunks.length - 1] += ` ${part}`;
    else chunks.push(part);
  }
  return chunks;
}

function makeChunk(input: Omit<IndexedRuleChunk, "contentHash" | "topicTags">): IndexedRuleChunk {
  const topicTags = topicTagsForRule(input.ruleNumber, input.ruleset === "beach" ? "beach" : "indoor", input.ruleset, input.chunkText);
  return {
    ...input,
    topicTags,
    contentHash: createHash("sha256").update(input.chunkText).digest("hex"),
  };
}

function appendixChunks(page: PdfRulePage, discipline: "indoor" | "beach") {
  if (discipline !== "indoor" || !/(?:4\s*v\s*4|6\s*v\s*6|tripleball|rallyball)/i.test(page.text)) return [];
  const markers = /(?=\b(?:4\s*v\s*4 Volleyball:|6\s*v\s*6 (?:Volleyball|Tripleball):|Tripleball Sequence|Guidelines for Tossers:))/gi;
  return page.text.split(markers).map(cleanLine).filter((part) => part.length >= 80).flatMap((part) => {
    const ruleset: RuleSet = /6\s*v\s*6/i.test(part) || (/tripleball/i.test(part) && page.pageNumber >= 49)
      ? "rallyball_6v6"
      : /4\s*v\s*4/i.test(part)
        ? "rallyball_4v4"
        : classifyRuleChunk(part, discipline);
    if (!["rallyball_4v4", "rallyball_6v6", "rallyball_unspecified"].includes(ruleset)) return [];
    return chunkWords(part).map((chunkText) => makeChunk({
      chunkText,
      pageNumber: page.pageNumber,
      ruleNumber: null,
      sectionTitle: ruleset === "rallyball_6v6" ? "6v6 Rallyball" : "4v4 Rallyball",
      caseNumber: null,
      topic: null,
      ruleset,
    }));
  });
}

export async function extractPdfPages(buffer: Buffer): Promise<PdfRulePage[]> {
  const pages: PdfRulePage[] = [];
  let pageNumber = 0;
  const parsePdf = pdf as unknown as (data: Buffer, options: object) => Promise<unknown>;
  await parsePdf(buffer, {
    pagerender: async (pageData: { getTextContent(options: object): Promise<{ items: Array<{ str: string; transform: number[] }> }> }) => {
      pageNumber += 1;
      const content = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      let previousY: number | undefined;
      let text = "";
      for (const item of content.items) {
        const currentY = item.transform[5];
        text += previousY === undefined || Math.abs(currentY - previousY) < 0.5 ? item.str : `\n${item.str}`;
        previousY = currentY;
      }
      pages.push({ pageNumber, text });
      return "";
    },
  });
  return pages;
}

export function buildRuleIndexChunks(pages: PdfRulePage[], discipline: "indoor" | "beach") {
  const output: IndexedRuleChunk[] = [];

  for (const page of pages) {
    output.push(...appendixChunks(page, discipline));
    if ((page.text.match(/\.{5,}/g) || []).length >= 4) continue;
    if (/SECTION III\s+DIAGRAMS/i.test(page.text)) continue;

    const lines = page.text.split(/\n+/).map(cleanLine).filter((line) => line && !PAGE_NOISE.test(line));
    const starts = lines.map((line, index) => ({ index, heading: ruleHeading(line) })).filter((item) => item.heading);
    if (!starts.length) continue;

    const sections = starts.map((start, index) => {
      const end = starts[index + 1]?.index ?? lines.length;
      return {
        ruleNumber: start.heading!.ruleNumber,
        title: start.heading!.title,
        text: lines.slice(start.index, end).join(" "),
      };
    });

    for (let index = 0; index < sections.length; index += 1) {
      const group = [sections[index]];
      let wordCount = sections[index].text.split(/\s+/).length;
      const topRule = sections[index].ruleNumber.split(".")[0];
      while (wordCount < 90 && sections[index + 1]?.ruleNumber.split(".")[0] === topRule) {
        index += 1;
        group.push(sections[index]);
        wordCount += sections[index].text.split(/\s+/).length;
      }
      const combined = group.map((section) => section.text).join(" ");
      const ruleset = classifyRuleChunk(combined, discipline);
      if (discipline === "indoor" && ruleset !== "standard_indoor") continue;
      for (const chunkText of chunkWords(combined)) {
        const ruleNumber = group[0].ruleNumber;
        const topic = primaryTopicForRule(ruleNumber, discipline);
        output.push(makeChunk({
          chunkText,
          pageNumber: page.pageNumber,
          ruleNumber,
          sectionTitle: group[0].title,
          caseNumber: chunkText.match(/\bCase\s+(\d+(?:\.\d+)*)\b/i)?.[1] || null,
          topic,
          ruleset: discipline === "beach" ? "beach" : "standard_indoor",
        }));
      }
    }
  }

  return output.filter((chunk, index, all) => all.findIndex((candidate) => candidate.contentHash === chunk.contentHash) === index);
}
