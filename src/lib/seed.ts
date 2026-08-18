import type {
  Impact,
  Incident,
  Notification,
  NotificationKind,
  Priority,
  Service,
  IncidentStatus,
  TimelineEvent,
  User,
} from "./types";

/** Deterministic PRNG so the demo dataset is stable across reloads. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const USERS: User[] = [
  { id: "u1", name: "Ava Mehta", email: "ava@acme.io", role: "admin", team: "Platform", avatarColor: "#2a78d6" },
  { id: "u2", name: "Diego Rivera", email: "diego@acme.io", role: "user", team: "Backend", avatarColor: "#b1481f" },
  { id: "u3", name: "Lena Osei", email: "lena@acme.io", role: "user", team: "Frontend", avatarColor: "#12775a" },
  { id: "u4", name: "Kai Tanaka", email: "kai@acme.io", role: "admin", team: "SRE", avatarColor: "#8a5c00" },
  { id: "u5", name: "Priya Nair", email: "priya@acme.io", role: "user", team: "Data", avatarColor: "#b0466f" },
  { id: "u6", name: "Sam Whitaker", email: "sam@acme.io", role: "user", team: "Support", avatarColor: "#5b4bb8" },
];

export const SERVICES: Service[] = [
  { id: "frontend", name: "Frontend", owner: "Web", tier: 1 },
  { id: "backend", name: "Backend", owner: "Platform", tier: 1 },
  { id: "database", name: "Database", owner: "Data", tier: 1 },
  { id: "prompt", name: "Prompt", owner: "AI", tier: 2 },
  { id: "config", name: "Config", owner: "SRE", tier: 2 },
];

type Seedling = [
  title: string,
  description: string,
  priority: Priority,
  impact: Impact,
  serviceId: string,
];

const TITLES: Seedling[] = [
  // Frontend
  ["Checkout page renders blank on Safari", "Bundle throws on an unsupported optional-chaining polyfill. Chrome and Firefox are unaffected.", "P1", "critical", "frontend"],
  ["Stale service worker serving last week's build", "Returning users are pinned to the previous release until a hard reload.", "P2", "major", "frontend"],
  ["Login form rejects pasted passwords", "The paste handler strips the input value before validation runs.", "P2", "major", "frontend"],
  ["Dashboard charts overflow on mobile", "Below 380px the chart container ignores its max-width and pushes the page sideways.", "P3", "minor", "frontend"],
  ["Bundle regression added 1.4s to first paint", "A date library got pulled into the entry chunk by an unguarded import.", "P3", "minor", "frontend"],
  ["Empty state flashes before data loads", "Skeletons unmount a frame early on slow connections.", "P4", "none", "frontend"],

  // Backend
  ["API 5xx spike right after the 14:02 deploy", "Error rate on POST /orders jumped from 0.2% to 11%. Requests time out at the payment provider edge.", "P1", "critical", "backend"],
  ["Duplicate charges on retried payments", "An idempotency key collision lets a small number of retries double-charge.", "P1", "critical", "backend"],
  ["Rate limiter rejecting valid partner keys", "Partner keys are being bucketed under the shared free-tier limit.", "P2", "major", "backend"],
  ["Webhook deliveries failing for 3 tenants", "Signature verification rejects our payloads after the cert rotation.", "P2", "major", "backend"],
  ["Refund workflow stuck in pending", "The state machine misses the provider callback and never advances.", "P2", "major", "backend"],
  ["Image uploads failing over 8MB", "The edge proxy body-size limit is lower than the documented API limit.", "P3", "minor", "backend"],
  ["Broken pagination in the orders export", "The cursor resets on page 12, producing duplicate rows.", "P4", "none", "backend"],

  // Database
  ["Migration locked the orders table for 6 minutes", "An unbatched backfill took an exclusive lock during peak traffic.", "P1", "critical", "database"],
  ["Connection pool saturated at peak", "The pool hits 100% every evening and queries queue for up to 3s.", "P2", "major", "database"],
  ["Replica lag over 40 minutes", "Read replicas are serving stale rows to the reporting path.", "P2", "major", "database"],
  ["Primary disk at 91%", "WAL growth outpaced the archival job after the retention change.", "P2", "major", "database"],
  ["N+1 query on the account detail view", "Large tenants time out loading memberships one row at a time.", "P3", "minor", "database"],
  ["Nightly backup failed three runs in a row", "The dump aborts on a schema drift in the orders table.", "P3", "minor", "database"],

  // Prompt
  ["System prompt rollout dropped the tool instructions", "The assistant stopped calling tools entirely after the template merge.", "P1", "critical", "prompt"],
  ["Assistant returning truncated answers", "Responses cut off mid-sentence once the context passes ~8k tokens.", "P2", "major", "prompt"],
  ["Token spend up 3x after the template change", "A verbose few-shot block was left in the production prompt.", "P2", "major", "prompt"],
  ["Classifier mislabeling refund requests", "Refund intents are landing in the billing-question bucket about a third of the time.", "P3", "minor", "prompt"],
  ["Prompt cache missing on every summarize call", "A timestamp in the prefix busts the cache on each request.", "P3", "minor", "prompt"],

  // Config
  ["Alerting silent for 6 hours after a bad rule reload", "The alert manager config reload failed and kept the last-good ruleset without alerting anyone.", "P1", "critical", "config"],
  ["Feature flag service returning defaults", "The flag SDK falls back to defaults when the config CDN 403s.", "P2", "major", "config"],
  ["Wrong env var promoted to production", "A staging endpoint shipped in the release manifest.", "P2", "major", "config"],
  ["TLS certificate expiring in 48 hours", "The wildcard cert was not picked up by the auto-renew job.", "P3", "minor", "config"],
  ["Log level left at debug, filling the disk", "Verbose logging from a debugging session was never reverted.", "P4", "none", "config"],
];

const ENVS = [
  "prod-us-east-1",
  "prod-us-east-1",
  "prod-eu-west-1",
  "prod-apac-1",
  "staging",
];

/** Call ids look like the ones the bot and VoiceStack hand out. */
function botCallId(rand: () => number) {
  return `bot_${Math.floor(rand() * 0xffffffff)
    .toString(16)
    .padStart(8, "0")}`;
}

function voicestackCallId(rand: () => number) {
  return `vs-${10000 + Math.floor(rand() * 89999)}-${1000 + Math.floor(rand() * 8999)}`;
}

const COMMENTS = [
  "Rolled back the last deploy, watching the error rate now.",
  "Confirmed this is isolated to eu-west-1. us-east-1 is healthy.",
  "Provider status page just went yellow — likely upstream.",
  "Scaled the worker pool from 6 to 18, the backlog is draining.",
  "Adding a dashboard panel so we catch this earlier next time.",
  "Support has been looped in, 4 accounts affected.",
  "Mitigation is holding. Keeping this in monitoring for an hour.",
  "Filed a follow-up to add an integration test for this path.",
];

const STATUS_FLOW: IncidentStatus[] = [
  "triage",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];

/** Mirrors PRIORITY_META targets, in hours, for shaping demo ETAs. */
const PRIORITY_TARGET_HOURS: Record<Priority, number> = {
  P1: 1,
  P2: 4,
  P3: 24,
  P4: 72,
};

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export interface SeedResult {
  incidents: Incident[];
  events: TimelineEvent[];
  notifications: Notification[];
}

/**
 * Builds a demo dataset anchored to `now`, so the dashboard always shows a
 * believable rolling window regardless of when the app is first opened.
 */
export function buildSeed(now = Date.now()): SeedResult {
  const rand = mulberry32(20260818);
  const incidents: Incident[] = [];
  const events: TimelineEvent[] = [];
  const notifications: Notification[] = [];
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;

  TITLES.forEach(([title, description, priority, impact, serviceId], i) => {
    // Decide open/closed first, then age accordingly: an open incident is
    // something the team is working right now, so it has to look fresh on the
    // board. Closed ones spread back across the quarter to feed the trends.
    const isOpen = rand() < 0.4;
    // Open incidents age against their own response target, so the board shows
    // a believable mix of "inside the window" and "past target".
    const openHours =
      priority === "P1"
        ? 0.2 + rand() * 5
        : priority === "P2"
          ? 0.5 + rand() * 16
          : priority === "P3"
            ? 2 + rand() * 64
            : 8 + rand() * 140;
    const ageDays = isOpen ? openHours / 24 : 1 + rand() * 74;
    const createdAt = new Date(now - ageDays * DAY);

    const status: IncidentStatus = isOpen
      ? STATUS_FLOW[Math.floor(rand() * 4)]
      : "resolved";

    const ackMinutes = 3 + Math.floor(rand() * 40);
    const acknowledgedAt =
      status === "triage" && rand() > 0.4
        ? null
        : new Date(Math.min(now, createdAt.getTime() + ackMinutes * 60_000));

    const resolveHours =
      priority === "P1"
        ? 0.7 + rand() * 3
        : priority === "P2"
          ? 2 + rand() * 10
          : priority === "P3"
            ? 6 + rand() * 40
            : 24 + rand() * 90;
    const resolvedAt =
      status === "resolved"
        ? new Date(createdAt.getTime() + resolveHours * HOUR)
        : null;

    const reporter = pick(rand, USERS);
    const assignee =
      status === "triage" && rand() > 0.5
        ? null
        : pick(rand, USERS);

    const id = `inc_${i + 1}`;

    // Most reports name one call; some arrive as a batch from support.
    const botCount = rand() < 0.25 ? 0 : rand() < 0.7 ? 1 : 2 + Math.floor(rand() * 3);
    const voiceCount = rand() < 0.45 ? 0 : rand() < 0.75 ? 1 : 2 + Math.floor(rand() * 2);

    // Assignees commit to an ETA on most open work; some of those slip.
    const eta =
      status === "resolved" || !assignee || rand() < 0.3
        ? null
        : new Date(
            now +
              (rand() < 0.25 ? -1 : 1) *
                (0.5 + rand() * 2) *
                PRIORITY_TARGET_HOURS[priority] *
                HOUR
          ).toISOString();

    const updatedAt =
      resolvedAt ??
      new Date(
        Math.min(now, createdAt.getTime() + rand() * ageDays * 0.8 * DAY)
      );

    incidents.push({
      id,
      key: `INC-${101 + i}`,
      title,
      description,
      priority,
      status,
      impact,
      serviceId,
      env: pick(rand, ENVS),
      botCallIds: Array.from({ length: botCount }, () => botCallId(rand)),
      voicestackCallIds: Array.from({ length: voiceCount }, () =>
        voicestackCallId(rand)
      ),
      attachments: [],
      reporterId: reporter.id,
      assigneeId: assignee?.id ?? null,
      // Whoever reported it is the one who handed it over, in the demo data.
      assignedById: assignee ? reporter.id : null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      acknowledgedAt: acknowledgedAt?.toISOString() ?? null,
      eta,
      resolvedAt: resolvedAt?.toISOString() ?? null,
      order: i,
    });

    // Timeline: creation, the statuses it walked through, plus chatter.
    let cursor = createdAt.getTime();
    events.push({
      id: `${id}_e0`,
      incidentId: id,
      kind: "created",
      message: `reported this incident as ${priority}`,
      authorId: reporter.id,
      at: createdAt.toISOString(),
    });

    const reachedIndex = STATUS_FLOW.indexOf(status);
    const ceiling = resolvedAt ? resolvedAt.getTime() : now;
    const stepSize = Math.min(
      1.8 * HOUR,
      (ceiling - createdAt.getTime()) / (reachedIndex + 1)
    );
    for (let s = 1; s <= reachedIndex; s++) {
      cursor += (0.4 + rand() * 0.6) * stepSize;
      if (cursor > ceiling) cursor = ceiling;
      events.push({
        id: `${id}_e${s}`,
        incidentId: id,
        kind: s === reachedIndex && status === "resolved" ? "resolved" : "status",
        message: `moved this to ${STATUS_FLOW[s]}`,
        authorId: (assignee ?? reporter).id,
        at: new Date(cursor).toISOString(),
      });
    }

    const chatter = Math.floor(rand() * 3);
    for (let c = 0; c < chatter; c++) {
      const at =
        createdAt.getTime() +
        rand() * Math.max(0, updatedAt.getTime() - createdAt.getTime());
      events.push({
        id: `${id}_c${c}`,
        incidentId: id,
        kind: "comment",
        message: pick(rand, COMMENTS),
        authorId: pick(rand, USERS).id,
        at: new Date(Math.min(at, updatedAt.getTime())).toISOString(),
      });
    }
  });

  // Board order is newest-first within each column.
  const byStatus = new Map<IncidentStatus, number>();
  incidents
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .forEach((inc) => {
      const next = byStatus.get(inc.status) ?? 0;
      inc.order = next;
      byStatus.set(inc.status, next + 1);
    });

  events.sort((a, b) => +new Date(a.at) - +new Date(b.at));

  // A starter inbox drawn from recent activity on still-open incidents, so the
  // notifications tab is not empty on first load.
  const recent = incidents
    .filter((i) => i.status !== "resolved" && i.assigneeId)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 9);

  recent.forEach((incident, index) => {
    const kind: NotificationKind =
      index % 4 === 0
        ? "assigned"
        : index % 4 === 1
          ? "comment"
          : index % 4 === 2
            ? "status"
            : "eta";
    const actor =
      USERS.find((u) => u.id === incident.reporterId) ?? USERS[0];
    notifications.push({
      id: `ntf_${incident.id}`,
      userId: incident.assigneeId!,
      incidentId: incident.id,
      kind,
      message: `${incident.key} · ${incident.title}`,
      actorId: actor.id === incident.assigneeId ? USERS[3].id : actor.id,
      at: incident.updatedAt,
      // The two oldest start read, so both states are visible.
      readAt: index >= 7 ? incident.updatedAt : null,
    });
  });

  notifications.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return { incidents, events, notifications };
}
