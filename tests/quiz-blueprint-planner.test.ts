import { describe, expect, it, vi } from "vitest";
import { blueprintConceptKey, blueprintFingerprint, rankBlueprintCandidates, reserveBlueprint } from "../lib/quiz-blueprint-planner";
import type { RetrievedRuleChunk } from "../lib/rag";

function chunk(index: number): RetrievedRuleChunk {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    document_id: "22222222-2222-4222-8222-222222222222",
    document_title: "Official Rules",
    document_type: "official_rulebook",
    discipline: "indoor",
    ruleset: "standard_indoor",
    chunk_text: `Rule ${index}.1 official text for concept ${index}.`,
    page_number: index,
    rule_number: `${index}.1`,
    section_title: `Section ${index}`,
    case_number: null,
    topic: "playing_actions",
    topic_tags: ["playing_actions"],
    source_url: null,
    storage_path: null,
    index_version: 1,
    chunk_index: index,
    content_hash: `hash-${index}`,
    similarity: 1,
  };
}

describe("deterministic novelty planning", () => {
  it("rotates across unused chunks, rules, and styles in a long simulation", () => {
    const chunks = Array.from({ length: 8 }, (_, index) => chunk(index + 1));
    const history: Array<Record<string, unknown> & { questionText: string }> = [];
    const selected = [];
    for (let index = 0; index < 80; index += 1) {
      const next = rankBlueprintCandidates(chunks, "playing_actions", "applied", history, new Set())[0];
      selected.push(next);
      history.unshift({
        questionText: `Question ${index}`,
        ruleId: next.ruleId,
        questionStyle: next.questionStyle,
        scenarioType: next.scenarioType,
        refereeRole: next.refereeRole,
        decisionType: next.decisionType,
        sourceChunkIds: [next.sourceChunkId],
      });
    }
    expect(new Set(selected.slice(0, 8).map((item) => item.sourceChunkId)).size).toBe(8);
    expect(new Set(selected.map((item) => item.ruleId)).size).toBe(8);
    expect(new Set(selected.map((item) => item.questionStyle)).size).toBeGreaterThan(3);
    expect(new Set(selected.map((item) => item.fingerprint)).size).toBeGreaterThan(40);
  });

  it("continues after a transactional reservation collision", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: "reservation-2", error: null });
    const candidates = rankBlueprintCandidates([chunk(1), chunk(2)], "playing_actions", "basic", [], new Set()).slice(0, 2);
    const result = await reserveBlueprint({
      supabase: { rpc } as never,
      userId: "11111111-1111-4111-8111-111111111111",
      scope: "adaptive",
      candidates,
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(result?.reservationId).toBe("reservation-2");
    expect(result?.fingerprint).toBe(candidates[1].fingerprint);
  });

  it("treats the same planned concept from two source chunks as a conceptual duplicate", () => {
    const first = rankBlueprintCandidates([chunk(1)], "playing_actions", "basic", [], new Set())[0];
    const secondBase = { ...first, sourceChunkId: chunk(2).id, chunk: chunk(2) };
    const second = { ...secondBase, fingerprint: blueprintFingerprint(secondBase) };
    expect(first.fingerprint).not.toBe(second.fingerprint);
    expect(blueprintConceptKey(first)).toBe(blueprintConceptKey(second));
  });
});
