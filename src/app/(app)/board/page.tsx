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
import { AssigneeFilterSelect } from "@/components/incidents/assignee-filter";
import { ASSIGNEE_ALL, matchesAssignee } from "@/lib/filters";
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
  const [assigneeFilter, setAssigneeFilter] = React.useState(ASSIGNEE_ALL);

  const filtered = React.useMemo(
    () =>
      incidents.filter((incident) => {
        if (priorityFilter !== "all" && incident.priority !== priorityFilter)
          return false;
        if (serviceFilter !== "all" && incident.serviceId !== serviceFilter)
          return false;
        if (!matchesAssignee(incident, assigneeFilter, user?.id)) return false;
        return true;
      }),
    [incidents, priorityFilter, serviceFilter, assigneeFilter, user?.id]
  );

  const filtersActive =
    priorityFilter !== "all" ||
    serviceFilter !== "all" ||
    assigneeFilter !== ASSIGNEE_ALL;

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

        <AssigneeFilterSelect
          size="sm"
          value={assigneeFilter}
          onChange={setAssigneeFilter}
        />

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPriorityFilter("all");
              setServiceFilter("all");
              setAssigneeFilter(ASSIGNEE_ALL);
            }}
          >
            Clear
          </Button>
        )}

        {/* The avatar strip doubles as a one-click assignee filter. */}
        <div className="ml-auto flex items-center -space-x-2">
          {users.map((u) => {
            const active = assigneeFilter === u.id;
            return (
              <motion.button
                key={u.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.94 }}
                onClick={() =>
                  setAssigneeFilter(active ? ASSIGNEE_ALL : u.id)
                }
                aria-pressed={active}
                title={
                  active ? `Clear filter on ${u.name}` : `Show only ${u.name}`
                }
                className={cn(
                  "rounded-full transition-[box-shadow,opacity]",
                  active
                    ? "ring-primary relative z-10 ring-2"
                    : assigneeFilter !== ASSIGNEE_ALL && "opacity-45"
                )}
              >
                <UserAvatar
                  user={u}
                  className="border-background size-7 border-2"
                />
              </motion.button>
            );
          })}
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
