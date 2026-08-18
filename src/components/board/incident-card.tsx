"use client";

import * as React from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { GripVertical, MessageSquare, TriangleAlert } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { isBreachingSla, slaBurn } from "@/lib/metrics";
import { useNow } from "@/hooks/use-now";
import type { Incident, Service, User } from "@/lib/types";

export interface CardContext {
  assignee?: User | null;
  service?: Service;
  commentCount: number;
}

export function IncidentCardBody({
  incident,
  context,
  dragging,
  handleProps,
}: {
  incident: Incident;
  context: CardContext;
  dragging?: boolean;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const now = useNow();
  const breached = isBreachingSla(incident, now);
  const burn = Math.min(1, slaBurn(incident, now));

  return (
    <div
      className={cn(
        "group bg-card relative overflow-hidden rounded-xl border p-3 shadow-sm transition-shadow",
        dragging ? "shadow-xl ring-2 ring-primary/40" : "hover:shadow-md"
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `var(--sev-${incident.severity.slice(3)})` }}
        aria-hidden
      />

      <div className="flex items-start gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <SeverityBadge severity={incident.severity} />
            <span className="text-muted-foreground font-mono text-[10px]">
              {incident.key}
            </span>
            {breached && (
              <span className="text-destructive ml-auto inline-flex items-center gap-1 text-[10px] font-medium">
                <TriangleAlert className="size-3" />
                overdue
              </span>
            )}
          </div>

          <Link
            href={`/incidents/${incident.id}`}
            className="mt-1.5 block text-sm leading-snug font-medium hover:underline"
          >
            {incident.title}
          </Link>

          {context.service && (
            <p className="text-muted-foreground mt-1 text-[11px]">
              {context.service.name}
            </p>
          )}

          {incident.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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

          <div className="mt-2.5 flex items-center gap-2">
            <UserAvatar user={context.assignee} className="size-6" />
            <span className="text-muted-foreground text-[11px]">
              {formatDistanceToNow(new Date(incident.updatedAt), {
                addSuffix: true,
              })}
            </span>
            {context.commentCount > 0 && (
              <span className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-[11px]">
                <MessageSquare className="size-3" />
                {context.commentCount}
              </span>
            )}
          </div>
        </div>

        {handleProps && (
          <button
            {...handleProps}
            aria-label={`Drag ${incident.key}`}
            className="text-muted-foreground/50 hover:text-foreground -mr-1 cursor-grab touch-none rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}
      </div>

      {incident.status !== "resolved" && (
        <div className="bg-muted mt-3 h-1 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full",
              breached ? "bg-destructive" : "bg-primary/60"
            )}
            style={{ width: `${burn * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function SortableIncidentCard({
  incident,
  context,
}: {
  incident: Incident;
  context: CardContext;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: incident.id, data: { status: incident.status } });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={incident.id}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <IncidentCardBody
        incident={incident}
        context={context}
        handleProps={
          { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>
        }
      />
    </motion.div>
  );
}
