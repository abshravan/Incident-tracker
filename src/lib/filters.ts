import type { Incident } from "./types";

/**
 * "all" | "mine" | "unassigned" | a user id. Shared by the board and the
 * incident list so the two cannot drift apart.
 */
export type AssigneeFilter = string;

export const ASSIGNEE_ALL = "all";
export const ASSIGNEE_MINE = "mine";
export const ASSIGNEE_UNASSIGNED = "unassigned";

export function matchesAssignee(
  incident: Pick<Incident, "assigneeId">,
  filter: AssigneeFilter,
  currentUserId: string | undefined
) {
  switch (filter) {
    case ASSIGNEE_ALL:
      return true;
    case ASSIGNEE_MINE:
      return !!currentUserId && incident.assigneeId === currentUserId;
    case ASSIGNEE_UNASSIGNED:
      return !incident.assigneeId;
    default:
      return incident.assigneeId === filter;
  }
}
