"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed, SERVICES, USERS } from "./seed";
import type {
  Incident,
  IncidentStatus,
  Service,
  Severity,
  TimelineEvent,
  User,
} from "./types";

export interface NewIncidentInput {
  title: string;
  description: string;
  severity: Severity;
  impact: Incident["impact"];
  serviceId: string;
  assigneeId: string | null;
  labels: string[];
  status?: IncidentStatus;
}

interface IncidentState {
  incidents: Incident[];
  events: TimelineEvent[];
  users: User[];
  services: Service[];
  hydrated: boolean;
  seededAt: string | null;

  seedIfEmpty: () => void;
  resetDemoData: () => void;

  createIncident: (input: NewIncidentInput, actorId: string) => Incident;
  updateIncident: (
    id: string,
    patch: Partial<Incident>,
    actorId: string,
    note?: string
  ) => void;
  moveIncident: (
    id: string,
    status: IncidentStatus,
    index: number,
    actorId: string
  ) => void;
  addComment: (incidentId: string, message: string, actorId: string) => void;
  deleteIncident: (id: string) => void;
}

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function nextKey(incidents: Incident[]) {
  const max = incidents.reduce((acc, i) => {
    const n = Number.parseInt(i.key.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 100);
  return `INC-${max + 1}`;
}

/** Renumbers a column so orders stay 0..n-1 with no gaps. */
function normalize(incidents: Incident[], status: IncidentStatus) {
  incidents
    .filter((i) => i.status === status)
    .sort((a, b) => a.order - b.order)
    .forEach((inc, idx) => {
      inc.order = idx;
    });
}

export const useIncidentStore = create<IncidentState>()(
  persist(
    (set, get) => ({
      incidents: [],
      events: [],
      users: USERS,
      services: SERVICES,
      hydrated: false,
      seededAt: null,

      seedIfEmpty: () => {
        if (get().incidents.length > 0) return;
        const { incidents, events } = buildSeed();
        set({
          incidents,
          events,
          users: USERS,
          services: SERVICES,
          seededAt: new Date().toISOString(),
        });
      },

      resetDemoData: () => {
        const { incidents, events } = buildSeed();
        set({
          incidents,
          events,
          users: USERS,
          services: SERVICES,
          seededAt: new Date().toISOString(),
        });
      },

      createIncident: (input, actorId) => {
        const now = new Date().toISOString();
        const status = input.status ?? "triage";
        const incident: Incident = {
          id: uid(),
          key: nextKey(get().incidents),
          title: input.title.trim(),
          description: input.description.trim(),
          severity: input.severity,
          status,
          impact: input.impact,
          serviceId: input.serviceId,
          reporterId: actorId,
          assigneeId: input.assigneeId,
          labels: input.labels,
          createdAt: now,
          updatedAt: now,
          acknowledgedAt: input.assigneeId ? now : null,
          resolvedAt: status === "resolved" ? now : null,
          order: -1, // lands at the top of its column
        };

        set((state) => {
          const incidents = [incident, ...state.incidents.map((i) => ({ ...i }))];
          normalize(incidents, status);
          return {
            incidents,
            events: [
              ...state.events,
              {
                id: uid(),
                incidentId: incident.id,
                kind: "created" as const,
                message: `reported this incident as ${incident.severity}`,
                authorId: actorId,
                at: now,
              },
            ],
          };
        });

        return incident;
      },

      updateIncident: (id, patch, actorId, note) => {
        const now = new Date().toISOString();
        const before = get().incidents.find((i) => i.id === id);
        if (!before) return;

        const newEvents: TimelineEvent[] = [];
        const log = (kind: TimelineEvent["kind"], message: string) =>
          newEvents.push({
            id: uid(),
            incidentId: id,
            kind,
            message,
            authorId: actorId,
            at: now,
          });

        if (patch.severity && patch.severity !== before.severity) {
          log("severity", `changed severity ${before.severity} → ${patch.severity}`);
        }
        if (patch.status && patch.status !== before.status) {
          log(
            patch.status === "resolved" ? "resolved" : "status",
            `moved this to ${patch.status}`
          );
        }
        if (patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId) {
          const name =
            get().users.find((u) => u.id === patch.assigneeId)?.name ?? "nobody";
          log("assignment", `assigned this to ${name}`);
        }
        if (note) log("action", note);

        set((state) => {
          const incidents = state.incidents.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...patch,
                  updatedAt: now,
                  acknowledgedAt:
                    i.acknowledgedAt ??
                    (patch.assigneeId || (patch.status && patch.status !== "triage")
                      ? now
                      : null),
                  resolvedAt:
                    patch.status === "resolved"
                      ? (i.resolvedAt ?? now)
                      : patch.status
                        ? null
                        : i.resolvedAt,
                }
              : i
          );
          if (patch.status && patch.status !== before.status) {
            normalize(incidents, before.status);
            normalize(incidents, patch.status);
          }
          return { incidents, events: [...state.events, ...newEvents] };
        });
      },

      moveIncident: (id, status, index, actorId) => {
        const now = new Date().toISOString();
        set((state) => {
          const incidents = state.incidents.map((i) => ({ ...i }));
          const moving = incidents.find((i) => i.id === id);
          if (!moving) return state;

          const from = moving.status;
          const column = incidents
            .filter((i) => i.status === status && i.id !== id)
            .sort((a, b) => a.order - b.order);

          const clamped = Math.max(0, Math.min(index, column.length));
          column.splice(clamped, 0, moving);

          moving.status = status;
          moving.updatedAt = now;
          if (status === "resolved") {
            moving.resolvedAt = moving.resolvedAt ?? now;
          } else {
            moving.resolvedAt = null;
          }
          if (!moving.acknowledgedAt && status !== "triage") {
            moving.acknowledgedAt = now;
          }
          column.forEach((inc, idx) => {
            inc.order = idx;
          });
          if (from !== status) normalize(incidents, from);

          const events =
            from === status
              ? state.events
              : [
                  ...state.events,
                  {
                    id: uid(),
                    incidentId: id,
                    kind: (status === "resolved" ? "resolved" : "status") as TimelineEvent["kind"],
                    message: `moved this to ${status}`,
                    authorId: actorId,
                    at: now,
                  },
                ];

          return { incidents, events };
        });
      },

      addComment: (incidentId, message, actorId) => {
        const now = new Date().toISOString();
        set((state) => ({
          events: [
            ...state.events,
            {
              id: uid(),
              incidentId,
              kind: "comment" as const,
              message: message.trim(),
              authorId: actorId,
              at: now,
            },
          ],
          incidents: state.incidents.map((i) =>
            i.id === incidentId ? { ...i, updatedAt: now } : i
          ),
        }));
      },

      deleteIncident: (id) =>
        set((state) => ({
          incidents: state.incidents.filter((i) => i.id !== id),
          events: state.events.filter((e) => e.incidentId !== id),
        })),
    }),
    {
      name: "incident-tracker/data",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        incidents: state.incidents,
        events: state.events,
        seededAt: state.seededAt,
      }),
    }
  )
);

if (typeof window !== "undefined") {
  const markReady = () => {
    useIncidentStore.setState({ hydrated: true });
    useIncidentStore.getState().seedIfEmpty();
  };
  // Rehydration may already have finished synchronously on this import.
  if (useIncidentStore.persist.hasHydrated()) markReady();
  useIncidentStore.persist.onFinishHydration(markReady);
}
