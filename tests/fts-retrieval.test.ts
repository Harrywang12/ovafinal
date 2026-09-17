import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("../lib/supabase", () => ({ getServerSupabase: () => ({ rpc }) }));

import { searchRuleChunks } from "../lib/rag";

describe("PostgreSQL rule retrieval", () => {
  beforeEach(() => rpc.mockReset().mockResolvedValue({ data: [], error: null }));

  it("uses FTS with discipline, ruleset, topic, and referee-level isolation", async () => {
    await searchRuleChunks("service authorization", {
      discipline: "beach",
      refereeLevel: "level_2",
      topic: "service_and_service_order",
      rulesets: ["beach"],
      excludeChunkIds: ["11111111-1111-4111-8111-111111111111"],
    }, 5);
    expect(rpc).toHaveBeenCalledWith("search_rule_chunks_fts", {
      search_query: "service authorization",
      match_count: 5,
      filter_discipline: "beach",
      filter_referee_level: "level_2",
      filter_document_types: null,
      filter_topic: "service_and_service_order",
      filter_rulesets: ["beach"],
      exclude_chunk_ids: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("query_embedding");
  });
});
