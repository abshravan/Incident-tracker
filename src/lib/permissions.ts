import type { Incident, Role, User } from "./types";

/**
 * What a role is allowed to do, in one place. Call sites ask for a capability
 * rather than comparing roles, so changing who can do what is a change to this
 * table and nothing else.
 */
export type Capability =
  | "view-analytics"
  | "view-people-stats"
  | "delete-incident"
  | "reset-demo-data"
  /** See the people directory and add accounts to it. */
  | "manage-users"
  /** Grant or revoke admin and super admin, and edit existing admins. */
  | "manage-admins"
  | "delete-users";

const ADMIN_CAPABILITIES: Capability[] = [
  "view-analytics",
  "view-people-stats",
  "delete-incident",
  "reset-demo-data",
  "manage-users",
];

const CAPABILITIES: Record<Role, Capability[]> = {
  superadmin: [...ADMIN_CAPABILITIES, "manage-admins", "delete-users"],
  admin: ADMIN_CAPABILITIES,
  user: [],
};

/** Most privileged first — used to order the directory and the role picker. */
export const ROLE_ORDER: Role[] = ["superadmin", "admin", "user"];

export const ROLE_META: Record<
  Role,
  { label: string; blurb: string; className: string }
> = {
  superadmin: {
    label: "Super admin",
    blurb: "Governs admins, and can remove accounts",
    className: "bg-[var(--pri-1)]/12 text-foreground border-[var(--pri-1)]/35",
  },
  admin: {
    label: "Admin",
    blurb: "Analytics, destructive actions, and adding people",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  user: {
    label: "User",
    blurb: "Reports and works incidents",
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function can(user: User | null | undefined, capability: Capability) {
  if (!user) return false;
  return CAPABILITIES[user.role].includes(capability);
}

export const isAdmin = (user: User | null | undefined) =>
  user?.role === "admin" || user?.role === "superadmin";

export const isSuperAdmin = (user: User | null | undefined) =>
  user?.role === "superadmin";

/**
 * The ETA is a commitment between two people: the assignee who owns the work,
 * and whoever assigned it to them. Either can set it, as can an admin.
 */
export function canSetEta(
  user: User | null | undefined,
  incident: Pick<Incident, "assigneeId" | "assignedById">
) {
  if (!user) return false;
  return (
    isAdmin(user) ||
    incident.assigneeId === user.id ||
    incident.assignedById === user.id
  );
}

/** Roles the actor is allowed to hand out. */
export function assignableRoles(actor: User | null | undefined): Role[] {
  if (can(actor, "manage-admins")) return ROLE_ORDER;
  if (can(actor, "manage-users")) return ["admin", "user"];
  return [];
}

/**
 * Whether `actor` may change `target`'s role. Nobody edits their own level —
 * that is how someone locks themselves out — and an admin cannot reach another
 * admin, which is the whole point of the tier above them.
 */
export function canEditUser(
  actor: User | null | undefined,
  target: Pick<User, "id" | "role">
) {
  if (!can(actor, "manage-users")) return false;
  if (actor!.id === target.id) return false;
  if (target.role === "admin" || target.role === "superadmin") {
    return can(actor, "manage-admins");
  }
  return true;
}

/**
 * Deleting is super-admin only, never yourself, and never the last super admin
 * — otherwise nobody can govern the admins again.
 */
export function canDeleteUser(
  actor: User | null | undefined,
  target: Pick<User, "id" | "role">,
  allUsers: Pick<User, "id" | "role">[]
) {
  if (!can(actor, "delete-users")) return false;
  if (actor!.id === target.id) return false;
  if (target.role === "superadmin") {
    return allUsers.filter((u) => u.role === "superadmin").length > 1;
  }
  return true;
}

/** Guards the same last-super-admin rule when a role is being changed away. */
export function canDemote(
  target: Pick<User, "id" | "role">,
  nextRole: Role,
  allUsers: Pick<User, "id" | "role">[]
) {
  if (target.role !== "superadmin" || nextRole === "superadmin") return true;
  return allUsers.filter((u) => u.role === "superadmin").length > 1;
}
