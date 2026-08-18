export type Priority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "triage"
  | "investigating"
  | "mitigating"
  | "monitoring"
  | "resolved";

export type Impact = "critical" | "major" | "minor" | "none";

/**
 * Two access levels. Everyone can run incidents; admins additionally see
 * org-wide analytics and people stats, and can perform destructive actions.
 * The capability matrix lives in src/lib/permissions.ts — check capabilities
 * there rather than comparing roles at the call site.
 */
export type Role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  avatarColor: string;
}

/**
 * File metadata. The bytes themselves live in IndexedDB (see
 * src/lib/attachments.ts) because localStorage cannot hold a screenshot.
 */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
}

export interface Service {
  id: string;
  name: string;
  owner: string;
  tier: 1 | 2 | 3;
}

export type TimelineKind =
  | "created"
  | "status"
  | "priority"
  | "assignment"
  | "comment"
  | "action"
  | "resolved";

export interface TimelineEvent {
  id: string;
  incidentId: string;
  kind: TimelineKind;
  message: string;
  authorId: string;
  at: string; // ISO
}

export interface Incident {
  id: string;
  key: string; // INC-104
  title: string;
  description: string;
  priority: Priority;
  status: IncidentStatus;
  impact: Impact;
  serviceId: string;
  /** Free-form environment the incident was seen in, e.g. "prod-us-east-1". */
  env: string;
  botCallIds: string[];
  voicestackCallIds: string[];
  attachments: Attachment[];
  reporterId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  order: number; // position within its board column
}

export const STATUSES: IncidentStatus[] = [
  "triage",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];

export const STATUS_META: Record<
  IncidentStatus,
  { label: string; description: string; dot: string; tint: string }
> = {
  triage: {
    label: "Triage",
    description: "Reported, not yet picked up",
    dot: "bg-slate-400",
    tint: "from-slate-500/10",
  },
  investigating: {
    label: "Investigating",
    description: "Root cause hunt in progress",
    dot: "bg-amber-500",
    tint: "from-amber-500/10",
  },
  mitigating: {
    label: "Mitigating",
    description: "Fix being applied",
    dot: "bg-orange-500",
    tint: "from-orange-500/10",
  },
  monitoring: {
    label: "Monitoring",
    description: "Watching for recurrence",
    dot: "bg-sky-500",
    tint: "from-sky-500/10",
  },
  resolved: {
    label: "Resolved",
    description: "Closed out with a write-up",
    dot: "bg-emerald-500",
    tint: "from-emerald-500/10",
  },
};

export const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

export const PRIORITY_META: Record<
  Priority,
  {
    label: string;
    blurb: string;
    className: string;
    chart: string;
    targetMinutes: number;
  }
> = {
  P1: {
    label: "P1",
    blurb: "Critical — all hands",
    className:
      "bg-[var(--pri-1)]/12 text-foreground border-[var(--pri-1)]/35",
    chart: "var(--pri-1)",
    targetMinutes: 60,
  },
  P2: {
    label: "P2",
    blurb: "High — major degradation",
    className:
      "bg-[var(--pri-2)]/12 text-foreground border-[var(--pri-2)]/35",
    chart: "var(--pri-2)",
    targetMinutes: 240,
  },
  P3: {
    label: "P3",
    blurb: "Medium — limited impact",
    className:
      "bg-[var(--pri-3)]/12 text-foreground border-[var(--pri-3)]/35",
    chart: "var(--pri-3)",
    targetMinutes: 1440,
  },
  P4: {
    label: "P4",
    blurb: "Low — cosmetic or tracked",
    className:
      "bg-[var(--pri-4)]/12 text-foreground border-[var(--pri-4)]/35",
    chart: "var(--pri-4)",
    targetMinutes: 4320,
  },
};

export const IMPACT_META: Record<Impact, { label: string }> = {
  critical: { label: "Critical — customer facing" },
  major: { label: "Major — degraded experience" },
  minor: { label: "Minor — internal only" },
  none: { label: "None — no user impact" },
};
