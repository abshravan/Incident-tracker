import type { User } from "./types";

/**
 * Historical references — who reported an incident, who wrote a comment —
 * outlive the account. Naming that state beats rendering a blank or a vague
 * "someone" that reads like missing data.
 */
export const REMOVED_USER_LABEL = "Removed user";

export function displayName(user: User | null | undefined) {
  return user?.name ?? REMOVED_USER_LABEL;
}
