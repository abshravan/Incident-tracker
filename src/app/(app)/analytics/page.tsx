"use client";

import * as React from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  MttrChart,
  ServiceChart,
  SeverityChart,
  TrendChart,
} from "@/components/dashboard/charts";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncidentStore } from "@/lib/store";
import { stagger } from "@/lib/motion";
import {
  dailyTrend,
  formatDuration,
  isOpen,
  mtta,
  mttr,
  mttrTrend,
  serviceBreakdown,
  severityBreakdown,
  withinWindow,
} from "@/lib/metrics";

const WINDOWS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export default function AnalyticsPage() {
  const incidents = useIncidentStore((s) => s.incidents);
  const services = useIncidentStore((s) => s.services);
  const users = useIncidentStore((s) => s.users);
  const [windowDays, setWindowDays] = React.useState("30");

  const days = Number(windowDays);
  const scoped = React.useMemo(
    () => withinWindow(incidents, days),
    [incidents, days]
  );

  const trend = React.useMemo(
    () => dailyTrend(incidents, Math.min(days, 60)),
    [incidents, days]
  );
  const severity = React.useMemo(() => severityBreakdown(scoped), [scoped]);
  const byService = React.useMemo(
    () => serviceBreakdown(scoped, services),
    [scoped, services]
  );
  const mttrSeries = React.useMemo(() => mttrTrend(incidents, 10), [incidents]);

  const byResponder = React.useMemo(() => {
    return users
      .map((user) => {
        const owned = scoped.filter((i) => i.assigneeId === user.id);
        const resolved = owned.filter((i) => i.resolvedAt);
        return {
          user,
          owned: owned.length,
          open: owned.filter(isOpen).length,
          resolved: resolved.length,
          mttr: mttr(owned),
        };
      })
      .filter((row) => row.owned > 0)
      .sort((a, b) => b.owned - a.owned);
  }, [scoped, users]);

  const resolved = scoped.filter((i) => i.resolvedAt).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Analytics"
        description="Reliability trends across services and responders"
        actions={
          <Tabs value={windowDays} onValueChange={setWindowDays}>
            <TabsList>
              {WINDOWS.map((w) => (
                <TabsTrigger key={w.value} value={w.value}>
                  {w.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      <motion.div
        variants={stagger()}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatTile label="Incidents reported" numeric={scoped.length} hint={`last ${days} days`} accent="var(--chart-1)" />
        <StatTile label="Resolved" numeric={resolved} hint={`${scoped.length ? Math.round((resolved / scoped.length) * 100) : 0}% of reported`} accent="var(--chart-2)" />
        <StatTile label="Mean time to acknowledge" value={formatDuration(mtta(scoped))} hint="report → first owner" accent="var(--chart-3)" />
        <StatTile label="Mean time to resolve" value={formatDuration(mttr(scoped))} hint="report → all clear" accent="var(--chart-4)" />
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
          description={`Daily counts, last ${Math.min(days, 60)} days`}
          series={[
            { label: "Reported", color: "var(--chart-1)" },
            { label: "Resolved", color: "var(--chart-2)" },
          ]}
        >
          <TrendChart data={trend} />
        </ChartCard>

        <ChartCard title="Severity mix" description={`Incidents in the last ${days} days`}>
          <SeverityChart data={severity} />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Incidents by service"
          description="Volume and open count per service"
        >
          <ServiceChart data={byService} />
        </ChartCard>

        <ChartCard
          title="Mean time to resolve by week"
          description="Trailing 10 weeks, hours"
        >
          <MttrChart data={mttrSeries} />
        </ChartCard>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-5 pt-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Service reliability
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              The same numbers as the chart, in a form you can read exactly
            </p>
          </div>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Incidents</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">MTTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byService.map((row) => (
                <TableRow key={row.service}>
                  <TableCell className="font-medium">{row.service}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.mttrHours ? `${row.mttrHours}h` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {byService.length === 0 && (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              No incidents in this window.
            </p>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 pt-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Responder load
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Who is carrying the pager in this window
            </p>
          </div>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Responder</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">MTTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byResponder.map((row) => (
                <TableRow key={row.user.id}>
                  <TableCell className="font-medium">{row.user.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.owned}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDuration(row.mttr)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {byResponder.length === 0 && (
            <p className="text-muted-foreground px-5 py-10 text-center text-sm">
              Nothing assigned in this window.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
