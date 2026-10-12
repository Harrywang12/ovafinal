import { z } from "zod";

export const USERNAME_RULES = "3-20 characters: letters, numbers, or underscores.";

export const usernameSchema = z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/, `Usernames must be ${USERNAME_RULES}`);

export function parseUsername(value: unknown): string | null {
  const parsed = usernameSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Public label for a learner who has not chosen a username yet. */
export function leaderboardName(username: string | null | undefined, userId: string) {
  return username || `Referee #${userId.replace(/-/g, "").slice(-4)}`;
}
