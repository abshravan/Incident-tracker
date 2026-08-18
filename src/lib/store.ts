"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed, SERVICES, USERS } from "./seed";
import { deleteAttachment } from "./attachments";
import { mentionedUserIds } from "./richtext";
import type {
  Attachment,
  Incident,
  Role,
  IncidentStatus,
  Notification,
  NotificationKind,
  Priority,
  Service,
  TimelineEvent,
  User,
} from "./types";

export interface NewUserInput {
  name: string;
  email: string;
  team: string;
  role: Role;
}

export interface NewIncidentInput {
  title: string;
  description: string;
  priority: Priority;
  impact: Incident["impact"];
  serviceId: string;
  env: string;
  botCallIds: string[];
  voicestackCallIds: string[];
  attachments: Attachment[];
  assigneeId: string | null;
  eta?: string | null;
  /** Defaults to the acting user when the form does not name someone else. */
  reporterId?: string;
  status?: IncidentStatus;
}

interface IncidentState {
  incidents: Incident[];
  events: TimelineEvent[];
  notifications: Notification[];
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
  addComment: (
    incidentId: string,
    message: string,
    actorId: string,
    attachments?: Attachment[]
  ) => void;
  createUser: (input: NewUserInput) => User;
  updateUserRole: (userId: string, role: Role) => void;
  deleteUser: (userId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  clearReadNotifications: (userId: string) => void;
  /** Only the assignee (or an admin) sets this — see canSetEta in permissions. */
  setEta: (incidentId: string, eta: string | null, actorId: string) => void;
  deleteIncident: (id: string) => void;
}

/** Avatar fills for accounts added after seeding. */
const AVATAR_COLORS = [
  "#2a78d6",
  "#b1481f",
  "#12775a",
  "#8a5c00",
  "#b0466f",
  "#5b4bb8",
  "#0f6f7a",
  "#7a3f9d",
];

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function nextKey(incidents: Incident[]) {
  const max = incidents.reduce((acc, i) => {
    const n = Number.parseInt(i.key.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 100);
  return `INC-${max + 1}`;
}

/**
 * Who hears about a change to an incident: the people carrying it. The actor
 * is always dropped — you do not get told about your own action.
 */
function watchersOf(incident: Incident, actorId: string) {
  return [...new Set([incident.assigneeId, incident.reporterId])].filter(
    (id): id is string => !!id && id !== actorId
  );
}

function buildNotifications(
  recipients: string[],
  incidentId: string,
  kind: NotificationKind,
  message: string,
  actorId: string,
  at: string
): Notification[] {
  return [...new Set(recipients)].map((userId) => ({
    id: uid(),
    userId,
    incidentId,
    kind,
    message,
    actorId,
    at,
    readAt: null,
  }));
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
      notifications: [],
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
          notifications: [],
          users: USERS,
          services: SERVICES,
          seededAt: new Date().toISOString(),
        });
      },

      resetDemoData: () => {
        const { incidents, events, notifications } = buildSeed();
        set({
          incidents,
          events,
          notifications,
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
          priority: input.priority,
          status,
          impact: input.impact,
          serviceId: input.serviceId,
          env: input.env.trim(),
          botCallIds: input.botCallIds,
          voicestackCallIds: input.voicestackCallIds,
          attachments: input.attachments,
          reporterId: input.reporterId || actorId,
          assigneeId: input.assigneeId,
          assignedById: input.assigneeId ? actorId : null,
          createdAt: now,
          updatedAt: now,
          acknowledgedAt: input.assigneeId ? now : null,
          eta: input.eta ?? null,
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
                // The event belongs to the reporter, who may not be whoever
                // filled in the form — note the filer so the trail stays honest.
                message:
                  incident.reporterId === actorId
                    ? `reported this incident as ${incident.priority}`
                    : `reported this incident as ${incident.priority} (filed by ${
                        state.users.find((u) => u.id === actorId)?.name ??
                        "someone else"
                      })`,
                authorId: incident.reporterId,
                at: now,
              },
            ],
            notifications: [
              ...state.notifications,
              ...buildNotifications(
                [
                  incident.assigneeId,
                  // Someone filing on your behalf is worth knowing about.
                  incident.reporterId !== actorId ? incident.reporterId : null,
                ].filter((id): id is string => !!id && id !== actorId),
                incident.id,
                incident.assigneeId && incident.assigneeId !== actorId
                  ? "assigned"
                  : "comment",
                `${incident.key} · ${incident.title}`,
                actorId,
                now
              ),
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

        if (patch.priority && patch.priority !== before.priority) {
          log("priority", `changed priority ${before.priority} → ${patch.priority}`);
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

        const recipients = new Set<string>();
        const notifyKinds: { kind: NotificationKind; extra?: string }[] = [];
        if (patch.assigneeId && patch.assigneeId !== before.assigneeId) {
          notifyKinds.push({ kind: "assigned", extra: patch.assigneeId });
        }
        if (patch.status && patch.status !== before.status) {
          notifyKinds.push({ kind: "status" });
        }
        if (patch.priority && patch.priority !== before.priority) {
          notifyKinds.push({ kind: "priority" });
        }
        for (const id2 of watchersOf(before, actorId)) recipients.add(id2);

        set((state) => {
          const incidents = state.incidents.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...patch,
                  assignedById:
                    patch.assigneeId !== undefined &&
                    patch.assigneeId !== i.assigneeId
                      ? actorId
                      : i.assignedById,
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
          const label = `${before.key} · ${before.title}`;
          const fresh = notifyKinds.flatMap(({ kind, extra }) =>
            buildNotifications(
              kind === "assigned"
                ? [extra!].filter((r) => r !== actorId)
                : [...recipients],
              id,
              kind,
              label,
              actorId,
              now
            )
          );

          return {
            incidents,
            events: [...state.events, ...newEvents],
            notifications: [...state.notifications, ...fresh],
          };
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

          const notifications =
            from === status
              ? state.notifications
              : [
                  ...state.notifications,
                  ...buildNotifications(
                    watchersOf(moving, actorId),
                    id,
                    "status",
                    `${moving.key} · ${moving.title}`,
                    actorId,
                    now
                  ),
                ];

          return { incidents, events, notifications };
        });
      },

      addComment: (incidentId, message, actorId, attachments) => {
        const now = new Date().toISOString();
        const incident = get().incidents.find((i) => i.id === incidentId);
        const mentioned = [...mentionedUserIds(message)].filter(
          (id) => id !== actorId && get().users.some((u) => u.id === id)
        );
        // A mention is the stronger signal, so someone both watching and
        // mentioned hears about it once, as a mention.
        const watchers = incident
          ? watchersOf(incident, actorId).filter((id) => !mentioned.includes(id))
          : [];

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
              attachments: attachments?.length ? attachments : undefined,
            },
          ],
          incidents: state.incidents.map((i) =>
            i.id === incidentId ? { ...i, updatedAt: now } : i
          ),
          notifications: [
            ...state.notifications,
            ...buildNotifications(
              mentioned,
              incidentId,
              "mention",
              incident ? `${incident.key} · ${incident.title}` : "",
              actorId,
              now
            ),
            ...buildNotifications(
              watchers,
              incidentId,
              "comment",
              incident ? `${incident.key} · ${incident.title}` : "",
              actorId,
              now
            ),
          ],
        }));
      },

      setEta: (incidentId, eta, actorId) => {
        const now = new Date().toISOString();
        const before = get().incidents.find((i) => i.id === incidentId);
        if (!before || before.eta === eta) return;

        const message = eta
          ? `set the ETA to ${new Date(eta).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}`
          : "cleared the ETA";

        set((state) => ({
          incidents: state.incidents.map((i) =>
            i.id === incidentId ? { ...i, eta, updatedAt: now } : i
          ),
          events: [
            ...state.events,
            {
              id: uid(),
              incidentId,
              kind: "eta" as const,
              message,
              authorId: actorId,
              at: now,
            },
          ],
          notifications: [
            ...state.notifications,
            ...buildNotifications(
              // The assigner cares about the ETA too, not just the watchers.
              [
                ...watchersOf(before, actorId),
                ...(before.assignedById && before.assignedById !== actorId
                  ? [before.assignedById]
                  : []),
              ],
              incidentId,
              "eta",
              `${before.key} · ${before.title}`,
              actorId,
              now
            ),
          ],
        }));
      },

      createUser: (input) => {
        const existing = get().users;
        const user: User = {
          id: uid(),
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          team: input.team.trim() || "Unassigned",
          role: input.role,
          avatarColor: AVATAR_COLORS[existing.length % AVATAR_COLORS.length],
        };
        set({ users: [...existing, user] });
        return user;
      },

      updateUserRole: (userId, role) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, role } : u
          ),
        })),

      deleteUser: (userId) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
          // Their open work goes back to the pool rather than pointing at an
          // account that no longer exists. Historical references — who reported
          // it, who wrote a comment — are left alone as the record of what
          // happened.
          incidents: state.incidents.map((i) =>
            i.assigneeId === userId || i.assignedById === userId
              ? {
                  ...i,
                  assigneeId: i.assigneeId === userId ? null : i.assigneeId,
                  assignedById:
                    i.assignedById === userId ? null : i.assignedById,
                }
              : i
          ),
          notifications: state.notifications.filter((n) => n.userId !== userId),
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id && !n.readAt
              ? { ...n, readAt: new Date().toISOString() }
              : n
          ),
        })),

      markAllNotificationsRead: (userId) => {
        const now = new Date().toISOString();
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId && !n.readAt ? { ...n, readAt: now } : n
          ),
        }));
      },

      clearReadNotifications: (userId) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => !(n.userId === userId && n.readAt)
          ),
        })),

      deleteIncident: (id) => {
        const incident = get().incidents.find((i) => i.id === id);
        const orphaned = [
          ...(incident?.attachments ?? []),
          // Images pasted into comments live on their timeline events.
          ...get()
            .events.filter((e) => e.incidentId === id)
            .flatMap((e) => e.attachments ?? []),
        ];
        for (const attachment of orphaned) {
          void deleteAttachment(attachment.id);
        }
        set((state) => ({
          incidents: state.incidents.filter((i) => i.id !== id),
          events: state.events.filter((e) => e.incidentId !== id),
          notifications: state.notifications.filter((n) => n.incidentId !== id),
        }));
      },
    }),
    {
      name: "incident-tracker/data",
      // v6 persists the user directory, which admins can now edit. Older
      // payloads are discarded and reseeded rather than migrated.
      version: 6,
      migrate: () => ({
        incidents: [],
        events: [],
        notifications: [],
        users: USERS,
        seededAt: null,
      }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        incidents: state.incidents,
        events: state.events,
        notifications: state.notifications,
        // Persisted now that admins can add, re-role and remove accounts.
        users: state.users,
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
