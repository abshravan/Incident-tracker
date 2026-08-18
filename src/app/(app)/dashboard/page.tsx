"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlarmClock,
  ArrowRight,
  Flame,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  MttrChart,
  ServiceChart,
  PriorityChart,
  TrendChart,
} from "@/components/dashboard/charts";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useIncidentStore } from "@/lib/store";
import { useNow } from "@/hooks/use-now";
import { displayName } from "@/lib/users";
import { useAuth } from "@/lib/auth";
import { stagger } from "@/lib/motion";
import {
  dailyTrend,
  delta,
  formatDuration,
  isPastTarget,
  isOpen,
  mtta,
  mttr,
  mttrTrend,
  serviceBreakdown,
  priorityBreakdown,
  targetBurn,
  withinWindow,
} from "@/lib/metrics";
import { PRIORITY_META } from "@/lib/types";

export default function DashboardPage() {
  const incidents = useIncidentStore((s) => s.incidents);
  const events = useIncidentStore((s) => s.events);
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);
  const { user } = useAuth();
  const now = useNow();

  const stats = React.useMemo(() => {
    const open = incidents.filter(isOpen);
    const last30 = withinWindow(incidents, 30);
    const prev30 = incidents.filter((i) => {
      const age = now - +new Date(i.createdAt);
      return age >= 30 * 86_400_000 && age < 60 * 86_400_000;
    });

    return {
      open,
      critical: open.filter((i) => i.priority === "P1" || i.priority === "P2"),
      breaching: open.filter((i) => isPastTarget(i)),
      unassigned: open.filter((i) => !i.assigneeId),
      mtta: mtta(last30),
      mttr: mttr(last30),
      mttrPrev: mttr(prev30),
      volume: last30.length,
      volumePrev: prev30.length,
      resolved30: last30.filter((i) => i.resolvedAt).length,
    };
  }, [incidents, now]);

  const trend = React.useMemo(() => dailyTrend(incidents, 30), [incidents]);
  const priority = React.useMemo(() => priorityBreakdown(incidents), [incidents]);
  const mttrSeries = React.useMemo(() => mttrTrend(incidents, 8), [incidents]);
  const byService = React.useMemo(
    () => serviceBreakdown(incidents, services).slice(0, 6),
    [incidents, services]
  );

  const attention = React.useMemo(
    () =>
      stats.open
        .slice()
        .sort((a, b) => targetBurn(b, now) - targetBurn(a, now))
        .slice(0, 5),
    [stats.open, now]
  );

  const recent = React.useMemo(
    () =>
      events
        .slice()
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 7),
    [events]
  );

  const userById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );
  const incidentById = React.useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents]
  );

  const resolutionRate = stats.volume
    ? Math.round((stats.resolved30 / stats.volume) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title={`Good to see you, ${user?.name.split(" ")[0] ?? "there"}`}
        description={`${stats.open.length} incidents open · ${stats.critical.length} at P1/P2 · rolling 30-day view`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/board">
              Open board
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <motion.div
        variants={stagger()}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatTile
          label="Open incidents"
          numeric={stats.open.length}
          hint={`${stats.unassigned.length} unassigned`}
          icon={Activity}
          accent="var(--chart-1)"
        />
        <StatTile
          label="Active P1 / P2"
          numeric={stats.critical.length}
          hint="needs an owner"
          icon={Flame}
          accent="var(--pri-1)"
        />
        <StatTile
          label="Mean time to acknowledge"
          value={formatDuration(stats.mtta)}
          hint="last 30 days"
          icon={AlarmClock}
          accent="var(--chart-3)"
        />
        <StatTile
          label="Mean time to resolve"
          value={formatDuration(stats.mttr)}
          hint="vs prior 30 days"
          deltaPercent={
            stats.mttr !== null && stats.mttrPrev !== null
              ? delta(stats.mttr, stats.mttrPrev)
              : null
          }
          deltaGoodWhen="down"
          icon={Timer}
          accent="var(--chart-2)"
        />
      </motion.div>

      <motion.div
        variants={stagger(0.06)}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-3"
      >
        <ChartCard
          className="lg:col-span-2"
          title="Reported vs resolved"
          description="Daily counts across the last 30 days"
          series={[
            { label: "Reported", color: "var(--chart-1)" },
            { label: "Resolved", color: "var(--chart-2)" },
          ]}
        >
          <TrendChart data={trend} />
        </ChartCard>

        <ChartCard
          title="Priority mix"
          description="All incidents on record"
        >
          <PriorityChart data={priority} />
          <div className="mt-4 px-3">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                Resolved within 30 days
              </span>
              <span className="font-medium tabular-nums">{resolutionRate}%</span>
            </div>
            <Progress value={resolutionRate} />
          </div>
        </ChartCard>
      </motion.div>

      <motion.div
        variants={stagger(0.06)}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-2"
      >
        <ChartCard
          title="Mean time to resolve by week"
          description="Hours from report to resolution, trailing 8 weeks"
        >
          <MttrChart data={mttrSeries} />
        </ChartCard>

        <ChartCard
          title="Incidents by service"
          description="Where the pain is concentrated"
        >
          <ServiceChart data={byService} />
        </ChartCard>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <ShieldAlert className="text-destructive size-4" />
                Needs attention
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Open incidents ranked by how much of their response window is
                gone
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/incidents">All</Link>
            </Button>
          </div>
          <div className="divide-y px-2 py-2">
            {attention.length === 0 && (
              <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                Nothing open. Enjoy the quiet.
              </p>
            )}
            {attention.map((incident) => {
              const burn = targetBurn(incident, now);
              const breached = burn >= 1;
              return (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="hover:bg-accent/60 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                >
                  <PriorityBadge priority={incident.priority} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {incident.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {incident.key} ·{" "}
                      {formatDistanceToNow(new Date(incident.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                  <span className="hidden w-28 shrink-0 sm:block">
                    <span
                      className={`text-[11px] font-medium ${
                        breached ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {breached
                        ? "past target"
                        : `${Math.round(burn * 100)}% of ${formatDuration(
                            PRIORITY_META[incident.priority].targetMinutes
                          )}`}
                    </span>
                    <Progress
                      className="mt-1 h-1.5"
                      value={Math.min(100, burn * 100)}
                      indicatorClassName={breached ? "bg-destructive" : undefined}
                    />
                  </span>
                  <UserAvatar
                    user={userById.get(incident.assigneeId ?? "")}
                    className="size-7 shrink-0"
                  />
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="px-5 pt-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Latest activity
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Every status change and comment across the org
            </p>
          </div>
          <div className="space-y-1 px-3 py-3">
            {recent.map((event) => {
              const author = userById.get(event.authorId);
              const incident = incidentById.get(event.incidentId);
              if (!incident) return null;
              return (
                <Link
                  key={event.id}
                  href={`/incidents/${incident.id}`}
                  className="hover:bg-accent/60 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors"
                >
                  <UserAvatar user={author} className="mt-0.5 size-7 shrink-0" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{displayName(author)}</span>{" "}
                    <span className="text-muted-foreground">
                      {event.kind === "comment"
                        ? `commented on ${incident.key}`
                        : `${event.message} on ${incident.key}`}
                    </span>
                    {event.kind === "comment" && (
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs italic">
                        “{event.message}”
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px] whitespace-nowrap">
                    {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
          {(
            [
              ["Triage", "triage"],
              ["Investigating", "investigating"],
              ["Mitigating", "mitigating"],
              ["Monitoring", "monitoring"],
              ["Resolved", "resolved"],
            ] as const
          ).map(([label, status]) => (
            <div key={status} className="flex items-center gap-2.5">
              <StatusBadge status={status} />
              <span className="text-lg font-semibold tabular-nums">
                {incidents.filter((i) => i.status === status).length}
              </span>
              <span className="text-muted-foreground sr-only">{label}</span>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="ml-auto" asChild>
            <Link href="/board">
              Work the board
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
