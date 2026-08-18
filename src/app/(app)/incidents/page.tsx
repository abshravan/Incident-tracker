"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIncidentStore } from "@/lib/store";
import { formatDuration, isOpen, minutesBetween } from "@/lib/metrics";
import {
  SEVERITIES,
  STATUSES,
  STATUS_META,
  type IncidentStatus,
  type Severity,
} from "@/lib/types";

type SortKey = "created" | "severity" | "updated";

const SEVERITY_RANK: Record<Severity, number> = {
  SEV1: 0,
  SEV2: 1,
  SEV3: 2,
  SEV4: 3,
};

export default function IncidentsPage() {
  const incidents = useIncidentStore((s) => s.incidents);
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);

  const [query, setQuery] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity | "all">("all");
  const [status, setStatus] = React.useState<IncidentStatus | "all" | "open">("open");
  const [service, setService] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("created");

  const userById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );
  const serviceById = React.useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services]
  );

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents
      .filter((incident) => {
        if (q) {
          const haystack = `${incident.key} ${incident.title} ${incident.labels.join(" ")}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (severity !== "all" && incident.severity !== severity) return false;
        if (status === "open" && !isOpen(incident)) return false;
        if (status !== "all" && status !== "open" && incident.status !== status)
          return false;
        if (service !== "all" && incident.serviceId !== service) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "severity") {
          const bySeverity =
            SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
          if (bySeverity !== 0) return bySeverity;
          return +new Date(b.createdAt) - +new Date(a.createdAt);
        }
        if (sort === "updated") {
          return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        }
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
  }, [incidents, query, severity, status, service, sort]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Incidents"
        description={`${rows.length} of ${incidents.length} incidents match your filters`}
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, key or label…"
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as IncidentStatus | "all" | "open")}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="size-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="all">Any status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severity}
            onValueChange={(v) => setSeverity(v as Severity | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any severity</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={service} onValueChange={setService}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="size-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest first</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[92px]">Key</TableHead>
              <TableHead>Incident</TableHead>
              <TableHead className="w-[90px]">Severity</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[150px]">Service</TableHead>
              <TableHead className="w-[110px]">Assignee</TableHead>
              <TableHead className="w-[110px]">Age</TableHead>
              <TableHead className="w-[110px]">Time to fix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {rows.map((incident, index) => {
                const assignee = incident.assigneeId
                  ? userById.get(incident.assigneeId)
                  : null;
                return (
                  <motion.tr
                    key={incident.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.012, 0.2) }}
                    className="hover:bg-muted/50 border-b transition-colors last:border-0"
                  >
                    <TableCell className="p-3">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="text-muted-foreground font-mono text-xs hover:underline"
                      >
                        {incident.key}
                      </Link>
                    </TableCell>
                    <TableCell className="p-3">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="block max-w-[420px] truncate text-sm font-medium hover:underline"
                      >
                        {incident.title}
                      </Link>
                      {incident.labels.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {incident.labels.slice(0, 3).map((label) => (
                            <span
                              key={label}
                              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-3">
                      <SeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell className="p-3">
                      <StatusBadge status={incident.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground p-3 text-xs">
                      {serviceById.get(incident.serviceId)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={assignee} className="size-6" />
                        <span className="text-muted-foreground truncate text-xs">
                          {assignee?.name.split(" ")[0] ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground p-3 text-xs"
                      title={format(new Date(incident.createdAt), "PPpp")}
                    >
                      {formatDistanceToNow(new Date(incident.createdAt))}
                    </TableCell>
                    <TableCell className="p-3 text-xs tabular-nums">
                      {incident.resolvedAt
                        ? formatDuration(
                            minutesBetween(incident.createdAt, incident.resolvedAt)
                          )
                        : "—"}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium">No incidents match those filters</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Try widening the status filter or clearing the search.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setSeverity("all");
                setStatus("all");
                setService("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
