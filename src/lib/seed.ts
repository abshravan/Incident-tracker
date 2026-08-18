import type {
  Impact,
  Incident,
  Service,
  Severity,
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
  { id: "u1", name: "Ava Mehta", email: "ava@acme.io", role: "commander", team: "Platform", avatarColor: "#2a78d6" },
  { id: "u2", name: "Diego Rivera", email: "diego@acme.io", role: "responder", team: "Payments", avatarColor: "#b1481f" },
  { id: "u3", name: "Lena Osei", email: "lena@acme.io", role: "responder", team: "Platform", avatarColor: "#12775a" },
  { id: "u4", name: "Kai Tanaka", email: "kai@acme.io", role: "admin", team: "SRE", avatarColor: "#8a5c00" },
  { id: "u5", name: "Priya Nair", email: "priya@acme.io", role: "responder", team: "Data", avatarColor: "#b0466f" },
  { id: "u6", name: "Sam Whitaker", email: "sam@acme.io", role: "observer", team: "Support", avatarColor: "#5b4bb8" },
];

export const SERVICES: Service[] = [
  { id: "s1", name: "Checkout API", owner: "Payments", tier: 1 },
  { id: "s2", name: "Auth Gateway", owner: "Platform", tier: 1 },
  { id: "s3", name: "Search Cluster", owner: "Platform", tier: 2 },
  { id: "s4", name: "Notification Service", owner: "Growth", tier: 2 },
  { id: "s5", name: "Data Warehouse ETL", owner: "Data", tier: 3 },
  { id: "s6", name: "Mobile BFF", owner: "Mobile", tier: 2 },
  { id: "s7", name: "CDN / Edge", owner: "SRE", tier: 1 },
];

const TITLES: [string, string, Severity, Impact][] = [
  ["Checkout 5xx spike in eu-west-1", "Error rate on POST /checkout jumped from 0.2% to 11% right after the 14:02 deploy. Payment captures are timing out at the provider edge.", "SEV1", "critical"],
  ["Login sessions dropped for SSO users", "Okta-backed SSO sessions are being invalidated after ~90s. Password logins are unaffected.", "SEV1", "critical"],
  ["Search latency p99 above 4s", "Query latency degraded after shard rebalance. Autocomplete is the worst hit path.", "SEV2", "major"],
  ["Push notifications delayed by 20+ minutes", "Queue backlog on the notification worker pool; consumers are lagging behind producers.", "SEV2", "major"],
  ["Nightly ETL job failed 3 runs in a row", "Warehouse loader is failing on a schema drift in the orders table.", "SEV3", "minor"],
  ["Mobile app cold start regression", "Android cold start up 800ms since 4.12.0 rolled to 20% of users.", "SEV3", "minor"],
  ["CDN cache hit ratio down to 61%", "Edge cache purge went wider than intended, causing an origin traffic surge.", "SEV2", "major"],
  ["Duplicate charges on retried payments", "Idempotency key collision is letting a small number of retries double-charge.", "SEV1", "critical"],
  ["Webhook deliveries failing for 3 tenants", "Signature verification rejects our payloads after the cert rotation.", "SEV2", "major"],
  ["Admin dashboard shows stale metrics", "Aggregation job lag means the dashboard trails real time by ~2h.", "SEV4", "none"],
  ["Rate limiter rejecting valid API keys", "Partner keys are being bucketed under the shared free-tier limit.", "SEV2", "major"],
  ["Image uploads failing over 8MB", "Edge proxy body-size limit is lower than the documented API limit.", "SEV3", "minor"],
  ["Elevated DB connection pool saturation", "Pool hits 100% during peak; queries queue for up to 3s.", "SEV2", "major"],
  ["Emails landing in spam for gmail.com", "SPF alignment broke after the new sending subdomain was added.", "SEV3", "minor"],
  ["Feature flag service returning defaults", "Flag SDK falls back to defaults when the config CDN 403s.", "SEV2", "major"],
  ["Broken pagination in orders export", "Cursor resets on page 12, producing duplicate rows in exports.", "SEV4", "none"],
  ["Kafka consumer group rebalancing loop", "Consumers rebalance every ~30s, stalling downstream processing.", "SEV2", "major"],
  ["TLS certificate expiring in 48 hours", "Wildcard cert for *.acme.io was not picked up by the auto-renew job.", "SEV3", "minor"],
  ["Region failover drill caused real traffic drop", "Planned drill routed 12% of live traffic into a cold region.", "SEV1", "critical"],
  ["Refund workflow stuck in pending", "State machine misses the provider callback and never advances.", "SEV2", "major"],
  ["Analytics events missing user_id", "Client SDK drops the identity field on session resume.", "SEV3", "minor"],
  ["Support tool timing out on large accounts", "N+1 query on the account detail view for tenants over 50k users.", "SEV3", "minor"],
  ["Password reset emails throttled", "Provider throttled us after a burst from the migration script.", "SEV2", "major"],
  ["Grafana alerting silent for 6 hours", "Alertmanager config reload failed silently after a bad rule.", "SEV1", "critical"],
];

const LABELS = ["regression", "deploy", "third-party", "capacity", "security", "data", "customer-reported", "monitoring-gap", "config"];

const COMMENTS = [
  "Rolled back the last deploy, watching error rate now.",
  "Confirmed this is isolated to eu-west-1. us-east-1 is healthy.",
  "Provider status page just went yellow — likely upstream.",
  "Scaled the worker pool from 6 to 18, backlog is draining.",
  "Adding a dashboard panel so we catch this earlier next time.",
  "Customer success has been looped in, 4 accounts affected.",
  "Mitigation is holding. Keeping this in monitoring for an hour.",
  "Filed a follow-up to add an integration test for this path.",
];

const STATUS_FLOW: IncidentStatus[] = ["triage", "investigating", "mitigating", "monitoring", "resolved"];

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export interface SeedResult {
  incidents: Incident[];
  events: TimelineEvent[];
}

/**
 * Builds a demo dataset anchored to `now`, so the dashboard always shows a
 * believable rolling window regardless of when the app is first opened.
 */
export function buildSeed(now = Date.now()): SeedResult {
  const rand = mulberry32(20260818);
  const incidents: Incident[] = [];
  const events: TimelineEvent[] = [];
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;

  TITLES.forEach(([title, description, severity, impact], i) => {
    // Decide open/closed first, then age accordingly: an open incident is
    // something the team is working right now, so it has to look fresh on the
    // board. Closed ones spread back across the quarter to feed the trends.
    const isOpen = rand() < 0.4;
    // Open incidents age against their own response target, so the board shows
    // a believable mix of "inside the window" and "past target".
    const openHours =
      severity === "SEV1"
        ? 0.2 + rand() * 5
        : severity === "SEV2"
          ? 0.5 + rand() * 16
          : severity === "SEV3"
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
        : new Date(
            Math.min(now, createdAt.getTime() + ackMinutes * 60_000)
          );

    const resolveHours =
      severity === "SEV1"
        ? 0.7 + rand() * 3
        : severity === "SEV2"
          ? 2 + rand() * 10
          : severity === "SEV3"
            ? 6 + rand() * 40
            : 24 + rand() * 90;
    const resolvedAt =
      status === "resolved"
        ? new Date(createdAt.getTime() + resolveHours * HOUR)
        : null;

    const reporter = pick(rand, USERS);
    const assignee =
      status === "triage" && rand() > 0.5 ? null : pick(rand, USERS.filter((u) => u.role !== "observer"));

    const id = `inc_${i + 1}`;
    const labelCount = 1 + Math.floor(rand() * 2);
    const labels = Array.from(
      new Set(Array.from({ length: labelCount }, () => pick(rand, LABELS)))
    );

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
      severity,
      status,
      impact,
      serviceId: pick(rand, SERVICES).id,
      reporterId: reporter.id,
      assigneeId: assignee?.id ?? null,
      labels,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      acknowledgedAt: acknowledgedAt?.toISOString() ?? null,
      resolvedAt: resolvedAt?.toISOString() ?? null,
      order: i,
    });

    // Timeline: creation, walk through the statuses it passed, plus chatter.
    let cursor = createdAt.getTime();
    events.push({
      id: `${id}_e0`,
      incidentId: id,
      kind: "created",
      message: `reported this incident as ${severity}`,
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
  return { incidents, events };
}
