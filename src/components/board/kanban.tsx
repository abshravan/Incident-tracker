"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { IncidentCardBody, SortableIncidentCard, type CardContext } from "./incident-card";
import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { Button } from "@/components/ui/button";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  STATUS_META,
  type Incident,
  type IncidentStatus,
} from "@/lib/types";

function Column({
  status,
  incidents,
  contextFor,
  children,
}: {
  status: IncidentStatus;
  incidents: Incident[];
  contextFor: (incident: Incident) => CardContext;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { status },
  });
  const meta = STATUS_META[status];

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col sm:w-[320px]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{meta.label}</h2>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
          {incidents.length}
        </span>
        <CreateIncidentDialog
          defaultStatus={status}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto opacity-60 hover:opacity-100"
              aria-label={`Report an incident in ${meta.label}`}
            >
              <Plus className="size-4" />
            </Button>
          }
        />
      </div>

      <p className="text-muted-foreground mb-2 px-1 text-[11px]">
        {meta.description}
      </p>

      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/40 min-h-[55vh] flex-1 space-y-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver && "border-primary/50 bg-primary/5"
        )}
      >
        <SortableContext
          items={incidents.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {incidents.map((incident) => (
              <SortableIncidentCard
                key={incident.id}
                incident={incident}
                context={contextFor(incident)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {incidents.length === 0 && (
          <p className="text-muted-foreground/70 px-2 py-8 text-center text-xs">
            Drop an incident here
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({ incidents }: { incidents: Incident[] }) {
  const users = useIncidentStore((s) => s.users);
  const services = useIncidentStore((s) => s.services);
  const events = useIncidentStore((s) => s.events);
  const moveIncident = useIncidentStore((s) => s.moveIncident);
  const { user } = useAuth();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const userById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );
  const serviceById = React.useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services]
  );
  const commentCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.kind !== "comment") continue;
      counts.set(event.incidentId, (counts.get(event.incidentId) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const contextFor = React.useCallback(
    (incident: Incident): CardContext => ({
      assignee: incident.assigneeId ? userById.get(incident.assigneeId) : null,
      service: serviceById.get(incident.serviceId),
      commentCount: commentCounts.get(incident.id) ?? 0,
    }),
    [userById, serviceById, commentCounts]
  );

  const columns = React.useMemo(() => {
    const map = new Map<IncidentStatus, Incident[]>();
    for (const status of STATUSES) {
      map.set(
        status,
        incidents
          .filter((i) => i.status === status)
          .sort((a, b) => a.order - b.order)
      );
    }
    return map;
  }, [incidents]);

  const activeIncident = activeId
    ? incidents.find((i) => i.id === activeId)
    : null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !user) return;

    const incident = incidents.find((i) => i.id === active.id);
    if (!incident) return;

    // Dropped on a column body, or on another card inside a column.
    const overId = String(over.id);
    let targetStatus: IncidentStatus;
    let targetIndex: number;

    if (overId.startsWith("column:")) {
      targetStatus = overId.slice("column:".length) as IncidentStatus;
      targetIndex = columns.get(targetStatus)?.length ?? 0;
    } else {
      const overIncident = incidents.find((i) => i.id === overId);
      if (!overIncident) return;
      targetStatus = overIncident.status;
      targetIndex = columns
        .get(targetStatus)!
        .filter((i) => i.id !== incident.id)
        .findIndex((i) => i.id === overId);
      if (targetIndex < 0) targetIndex = 0;
    }

    if (incident.status === targetStatus && incident.order === targetIndex) return;

    moveIncident(incident.id, targetStatus, targetIndex, user.id);

    if (incident.status !== targetStatus) {
      toast(`${incident.key} → ${STATUS_META[targetStatus].label}`, {
        description: incident.title,
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            incidents={columns.get(status) ?? []}
            contextFor={contextFor}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {activeIncident && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.03, rotate: -1.5 }}
            className="w-[300px] sm:w-[320px]"
          >
            <IncidentCardBody
              incident={activeIncident}
              context={contextFor(activeIncident)}
              dragging
            />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
