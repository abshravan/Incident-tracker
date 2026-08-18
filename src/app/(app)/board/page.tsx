"use client";

import * as React from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/page-header";
import { KanbanBoard } from "@/components/board/kanban";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PRIORITIES, type Priority } from "@/lib/types";

export default function BoardPage() {
  const incidents = useIncidentStore((s) => s.incidents);
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);
  const { user } = useAuth();

  const [priorityFilter, setPriorityFilter] = React.useState<Priority | "all">("all");
  const [serviceFilter, setServiceFilter] = React.useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all");

  const filtered = React.useMemo(
    () =>
      incidents.filter((incident) => {
        if (priorityFilter !== "all" && incident.priority !== priorityFilter)
          return false;
        if (serviceFilter !== "all" && incident.serviceId !== serviceFilter)
          return false;
        if (assigneeFilter === "mine" && incident.assigneeId !== user?.id)
          return false;
        if (assigneeFilter === "unassigned" && incident.assigneeId) return false;
        return true;
      }),
    [incidents, priorityFilter, serviceFilter, assigneeFilter, user?.id]
  );

  const filtersActive =
    priorityFilter !== "all" || serviceFilter !== "all" || assigneeFilter !== "all";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title="Response board"
        description="Drag an incident between columns to move the response forward — the timeline records every move."
      />

      {/* Filters sit in one row above the board. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(["all", ...PRIORITIES] as const).map((option) => (
            <button
              key={option}
              onClick={() => setPriorityFilter(option as Priority | "all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                priorityFilter === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {option === "all" ? "All priorities" : option}
            </button>
          ))}
        </div>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="mine">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPriorityFilter("all");
              setServiceFilter("all");
              setAssigneeFilter("all");
            }}
          >
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center -space-x-2">
          {users.slice(0, 5).map((u) => (
            <UserAvatar
              key={u.id}
              user={u}
              className="border-background size-7 border-2"
            />
          ))}
          <span className="text-muted-foreground pl-4 text-xs">
            {filtered.length} shown
          </span>
        </div>
      </motion.div>

      <div className="min-h-0 flex-1">
        <KanbanBoard incidents={filtered} />
      </div>
    </div>
  );
}
