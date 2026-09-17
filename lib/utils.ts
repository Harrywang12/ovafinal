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

export function assertEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
