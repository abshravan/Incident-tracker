export type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export type IncidentStatus =
  | "triage"
  | "investigating"
  | "mitigating"
  | "monitoring"
  | "resolved";

export type Impact = "critical" | "major" | "minor" | "none";

export type Role = "responder" | "commander" | "observer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  avatarColor: string;
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
  | "severity"
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
  severity: Severity;
  status: IncidentStatus;
  impact: Impact;
  serviceId: string;
  reporterId: string;
  assigneeId: string | null;
  labels: string[];
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

export const SEVERITIES: Severity[] = ["SEV1", "SEV2", "SEV3", "SEV4"];

export const SEVERITY_META: Record<
  Severity,
  { label: string; blurb: string; className: string; chart: string; slaMinutes: number }
> = {
  SEV1: {
    label: "SEV1",
    blurb: "Full outage — all hands",
    className:
      "bg-[var(--sev-1)]/12 text-foreground border-[var(--sev-1)]/35",
    chart: "var(--sev-1)",
    slaMinutes: 60,
  },
  SEV2: {
    label: "SEV2",
    blurb: "Major degradation",
    className:
      "bg-[var(--sev-2)]/12 text-foreground border-[var(--sev-2)]/35",
    chart: "var(--sev-2)",
    slaMinutes: 240,
  },
  SEV3: {
    label: "SEV3",
    blurb: "Partial / limited impact",
    className:
      "bg-[var(--sev-3)]/12 text-foreground border-[var(--sev-3)]/35",
    chart: "var(--sev-3)",
    slaMinutes: 1440,
  },
  SEV4: {
    label: "SEV4",
    blurb: "Cosmetic or tracked follow-up",
    className:
      "bg-[var(--sev-4)]/12 text-foreground border-[var(--sev-4)]/35",
    chart: "var(--sev-4)",
    slaMinutes: 4320,
  },
};

export const IMPACT_META: Record<Impact, { label: string }> = {
  critical: { label: "Critical — customer facing" },
  major: { label: "Major — degraded experience" },
  minor: { label: "Minor — internal only" },
  none: { label: "None — no user impact" },
};
