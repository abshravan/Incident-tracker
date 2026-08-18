import type { Incident, Role, User } from "./types";

/**
 * What a role is allowed to do, in one place. Call sites ask for a capability
 * rather than comparing roles, so adding a third level later is a change to
 * this table and nothing else.
 */
export type Capability =
  | "view-analytics"
  | "view-people-stats"
  | "delete-incident"
  | "reset-demo-data";

const CAPABILITIES: Record<Role, Capability[]> = {
  admin: [
    "view-analytics",
    "view-people-stats",
    "delete-incident",
    "reset-demo-data",
  ],
  user: [],
};

export const ROLE_META: Record<Role, { label: string; blurb: string }> = {
  admin: {
    label: "Admin",
    blurb: "Full access, including analytics and destructive actions",
  },
  user: {
    label: "User",
    blurb: "Reports and works incidents",
  },
};

export function can(user: User | null | undefined, capability: Capability) {
  if (!user) return false;
  return CAPABILITIES[user.role].includes(capability);
}

export const isAdmin = (user: User | null | undefined) => user?.role === "admin";

/**
 * The ETA is the assignee's commitment, so it is theirs to set. Admins can too,
 * since they can already change everything else on the record.
 */
export function canSetEta(
  user: User | null | undefined,
  incident: Pick<Incident, "assigneeId">
) {
  if (!user) return false;
  return isAdmin(user) || incident.assigneeId === user.id;
}
