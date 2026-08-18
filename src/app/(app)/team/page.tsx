"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import { formatDuration, isOpen, mttr } from "@/lib/metrics";

export default function TeamPage() {
  const incidents = useIncidentStore((s) => s.incidents);
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);
  const { user: me } = useAuth();

  const rows = React.useMemo(
    () =>
      users.map((user) => {
        const owned = incidents.filter((i) => i.assigneeId === user.id);
        const open = owned.filter(isOpen);
        return {
          user,
          owned,
          open,
          resolved: owned.filter((i) => i.resolvedAt).length,
          mttr: mttr(owned),
        };
      }),
    [incidents, users]
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Team"
        description="Who owns what right now, and how their queue looks"
      />

      <motion.div
        variants={stagger()}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {rows.map(({ user, open, owned, resolved, mttr: userMttr }) => (
          <motion.div key={user.id} variants={fadeUp}>
            <Card className="h-full">
              <div className="flex items-start gap-3 px-5 pt-5">
                <UserAvatar user={user} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {user.name}
                    {user.id === me?.id && (
                      <Badge variant="secondary" className="text-[10px]">
                        you
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {user.role} · {user.team}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 px-5 pt-4">
                {[
                  ["Open", open.length],
                  ["Resolved", resolved],
                  ["MTTR", formatDuration(userMttr)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-muted/50 rounded-lg px-2 py-2 text-center">
                    <p className="text-sm font-semibold tabular-nums">{value}</p>
                    <p className="text-muted-foreground text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 px-3 pb-4">
                {open.slice(0, 3).map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    className="hover:bg-accent flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <SeverityBadge severity={incident.severity} showDot={false} />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {incident.title}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {formatDistanceToNow(new Date(incident.updatedAt))}
                    </span>
                  </Link>
                ))}
                {open.length === 0 && (
                  <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                    Queue is clear · {owned.length} handled all-time
                  </p>
                )}
                {open.length > 3 && (
                  <p className="text-muted-foreground px-2 pt-1 text-[11px]">
                    +{open.length - 3} more open
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Card>
        <div className="px-5 pt-5">
          <h2 className="text-sm font-semibold tracking-tight">Services</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Ownership and current open count per service
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const open = incidents.filter(
              (i) => i.serviceId === service.id && isOpen(i)
            );
            return (
              <div
                key={service.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{service.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {service.owner} · tier {service.tier}
                  </p>
                </div>
                {open.length > 0 ? (
                  <StatusBadge status={open[0].status} />
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    healthy
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
