export function difficultyToDuration(difficulty: "easy" | "medium" | "hard" | "extreme") {
  switch (difficulty) {
    case "easy":
      return 20;
    case "medium":
      return 15;
    case "hard":
      return 12;
    default:
      return 12;
  }
}

export function formatRuleContext(chunks: { chunk: string; similarity?: number }[]) {
  return chunks
    .map(
      (c, idx) =>
        `Rule Snippet ${idx + 1}${c.similarity ? ` (sim ${c.similarity.toFixed(2)})` : ""}:\n${
          c.chunk
        }`
    )
    .join("\n\n");
}

export function assertEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
