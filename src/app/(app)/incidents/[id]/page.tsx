"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidentStore } from "@/lib/store";
import { useNow } from "@/hooks/use-now";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import {
  formatDuration,
  isBreachingSla,
  minutesBetween,
  slaBurn,
} from "@/lib/metrics";
import {
  IMPACT_META,
  SEVERITIES,
  SEVERITY_META,
  STATUSES,
  STATUS_META,
  type IncidentStatus,
  type Severity,
  type TimelineKind,
} from "@/lib/types";

const KIND_STYLE: Record<TimelineKind, { dot: string; label: string }> = {
  created: { dot: "bg-primary", label: "Reported" },
  status: { dot: "bg-sky-500", label: "Status" },
  severity: { dot: "bg-amber-500", label: "Severity" },
  assignment: { dot: "bg-violet-500", label: "Assignment" },
  comment: { dot: "bg-muted-foreground", label: "Comment" },
  action: { dot: "bg-muted-foreground", label: "Action" },
  resolved: { dot: "bg-emerald-500", label: "Resolved" },
};

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const now = useNow();

  const incident = useIncidentStore((s) =>
    s.incidents.find((i) => i.id === params.id)
  );
  const events = useIncidentStore((s) => s.events);
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);
  const updateIncident = useIncidentStore((s) => s.updateIncident);
  const addComment = useIncidentStore((s) => s.addComment);
  const deleteIncident = useIncidentStore((s) => s.deleteIncident);

  const [draft, setDraft] = React.useState("");

  const userById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );

  const timeline = React.useMemo(
    () =>
      events
        .filter((e) => e.incidentId === params.id)
        .sort((a, b) => +new Date(a.at) - +new Date(b.at)),
    [events, params.id]
  );

  if (!incident) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div>
          <p className="text-sm font-medium">Incident not found</p>
          <p className="text-muted-foreground mt-1 text-sm">
            It may have been deleted from this browser.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/incidents">Back to incidents</Link>
          </Button>
        </div>
      </div>
    );
  }

  const service = services.find((s) => s.id === incident.serviceId);
  const reporter = userById.get(incident.reporterId);
  const assignee = incident.assigneeId
    ? userById.get(incident.assigneeId)
    : null;
  const burn = slaBurn(incident, now);
  const breached = isBreachingSla(incident, now);
  const meta = SEVERITY_META[incident.severity];

  function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !user || !incident) return;
    addComment(incident.id, draft, user.id);
    setDraft("");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <motion.div
        variants={stagger()}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <span className="text-muted-foreground font-mono text-xs">
            {incident.key}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {incident.status !== "resolved" && (
              <Button
                size="sm"
                onClick={() => {
                  if (!user) return;
                  updateIncident(incident.id, { status: "resolved" }, user.id);
                  toast.success(`${incident.key} resolved`);
                }}
              >
                <CheckCircle2 className="size-4" />
                Mark resolved
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete incident"
              onClick={() => {
                deleteIncident(incident.id);
                toast(`${incident.key} deleted`);
                router.push("/incidents");
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <span className="text-muted-foreground text-xs">
              {IMPACT_META[incident.impact].label}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
            {incident.title}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Reported by {reporter?.name ?? "someone"}{" "}
            {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
            {service && ` · ${service.name}`}
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <motion.div variants={fadeUp}>
              <Card className="px-5 py-4">
                <h2 className="text-xs font-semibold tracking-wide uppercase">
                  Summary
                </h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                  {incident.description || "No description was captured."}
                </p>
                {incident.labels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {incident.labels.map((label) => (
                      <span
                        key={label}
                        className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="px-5 py-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                  <MessageSquare className="size-3.5" />
                  Timeline
                </h2>

                <ol className="mt-4 space-y-0">
                  <AnimatePresence initial={false}>
                    {timeline.map((event, index) => {
                      const author = userById.get(event.authorId);
                      const style = KIND_STYLE[event.kind];
                      const last = index === timeline.length - 1;
                      return (
                        <motion.li
                          key={event.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.22 }}
                          className="relative flex gap-3 pb-5 last:pb-0"
                        >
                          {!last && (
                            <span
                              className="bg-border absolute top-6 bottom-0 left-[11px] w-px"
                              aria-hidden
                            />
                          )}
                          <span
                            className={`mt-1.5 size-[22px] shrink-0 rounded-full border-4 border-[var(--card)] ${style.dot}`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <span className="font-medium">
                                {author?.name ?? "Someone"}
                              </span>{" "}
                              {event.kind === "comment" ? (
                                <span className="text-muted-foreground">
                                  commented
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {event.message}
                                </span>
                              )}
                            </p>
                            {event.kind === "comment" && (
                              <p className="bg-muted/60 mt-1.5 rounded-lg px-3 py-2 text-sm leading-relaxed">
                                {event.message}
                              </p>
                            )}
                            <p
                              className="text-muted-foreground mt-1 text-[11px]"
                              title={format(new Date(event.at), "PPpp")}
                            >
                              {format(new Date(event.at), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ol>

                <Separator className="my-4" />

                <form onSubmit={submitComment} className="flex gap-3">
                  <UserAvatar user={user} className="mt-1 size-8 shrink-0" />
                  <div className="flex-1">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Post an update — what you tried, what you saw, what is next."
                      rows={2}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          submitComment(e);
                        }
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">
                        ⌘ + Enter to post
                      </span>
                      <Button size="sm" type="submit" disabled={!draft.trim()}>
                        <Send className="size-3.5" />
                        Post update
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>

          <motion.aside variants={fadeUp} className="space-y-4">
            <Card className="px-5 py-4">
              <h2 className="text-xs font-semibold tracking-wide uppercase">
                Response clock
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">
                      {incident.severity} target
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatDuration(meta.slaMinutes)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, burn * 100)}
                    indicatorClassName={breached ? "bg-destructive" : undefined}
                  />
                  <p
                    className={`mt-1.5 text-[11px] ${
                      breached ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {incident.resolvedAt
                      ? `Closed in ${formatDuration(
                          minutesBetween(incident.createdAt, incident.resolvedAt)
                        )}`
                      : breached
                        ? "Past the response target"
                        : `${Math.round(burn * 100)}% of the window used`}
                  </p>
                </div>

                <Separator />

                <dl className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Acknowledged
                    </dt>
                    <dd className="tabular-nums">
                      {incident.acknowledgedAt
                        ? formatDuration(
                            minutesBetween(
                              incident.createdAt,
                              incident.acknowledgedAt
                            )
                          )
                        : "not yet"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Opened</dt>
                    <dd>{format(new Date(incident.createdAt), "MMM d, HH:mm")}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Last update</dt>
                    <dd>{format(new Date(incident.updatedAt), "MMM d, HH:mm")}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            <Card className="space-y-3 px-5 py-4">
              <h2 className="text-xs font-semibold tracking-wide uppercase">
                Details
              </h2>

              <div className="grid gap-1.5">
                <label className="text-muted-foreground text-xs">Status</label>
                <Select
                  value={incident.status}
                  onValueChange={(v) =>
                    user &&
                    updateIncident(
                      incident.id,
                      { status: v as IncidentStatus },
                      user.id
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-muted-foreground text-xs">Severity</label>
                <Select
                  value={incident.severity}
                  onValueChange={(v) =>
                    user &&
                    updateIncident(
                      incident.id,
                      { severity: v as Severity },
                      user.id
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} — {SEVERITY_META[s].blurb}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-muted-foreground text-xs">Assignee</label>
                <Select
                  value={incident.assigneeId ?? "unassigned"}
                  onValueChange={(v) =>
                    user &&
                    updateIncident(
                      incident.id,
                      { assigneeId: v === "unassigned" ? null : v },
                      user.id
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!assignee && user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    updateIncident(incident.id, { assigneeId: user.id }, user.id)
                  }
                >
                  <UserPlus className="size-4" />
                  Assign to me
                </Button>
              )}

              <Separator />

              <dl className="grid gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Service</dt>
                  <dd>{service?.name ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Owner team</dt>
                  <dd>{service?.owner ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Reporter</dt>
                  <dd className="flex items-center gap-1.5">
                    <UserAvatar user={reporter} className="size-5" />
                    {reporter?.name}
                  </dd>
                </div>
              </dl>
            </Card>
          </motion.aside>
        </div>
      </motion.div>
    </div>
  );
}
