"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { PriorityBadge } from "@/components/priority-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_META } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERB: Record<string, string> = {
  assigned: "assigned this to you",
  mention: "mentioned you",
  comment: "commented",
  status: "changed the status",
  priority: "changed the priority",
  eta: "updated the ETA",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { items, unread } = useNotifications();
  const incidents = useIncidentStore((s) => s.incidents);
  const users = useIncidentStore((s) => s.users);
  const markRead = useIncidentStore((s) => s.markNotificationRead);
  const markAllRead = useIncidentStore((s) => s.markAllNotificationsRead);
  const clearRead = useIncidentStore((s) => s.clearReadNotifications);

  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const incidentById = React.useMemo(
    () => new Map(incidents.map((i) => [i.id, i])),
    [incidents]
  );
  const userById = React.useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );

  const shown = filter === "unread" ? items.filter((n) => !n.readAt) : items;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread of ${items.length}`
            : `${items.length} notification${items.length === 1 ? "" : "s"}, all read`
        }
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as "all" | "unread")}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
            {unread > 0 && user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead(user.id)}
              >
                <CheckCheck className="size-4" />
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="divide-y">
          <AnimatePresence initial={false}>
            {shown.map((notification) => {
              const incident = incidentById.get(notification.incidentId);
              const actor = userById.get(notification.actorId);
              const meta = NOTIFICATION_META[notification.kind];
              const unreadItem = !notification.readAt;

              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ type: "spring", stiffness: 460, damping: 38 }}
                >
                  <Link
                    href={
                      incident ? `/incidents/${incident.id}` : "/notifications"
                    }
                    onClick={() => markRead(notification.id)}
                    className={cn(
                      "hover:bg-accent/50 flex gap-3 px-4 py-3 transition-colors",
                      unreadItem && "bg-primary/[0.04]"
                    )}
                  >
                    <span className="relative mt-1 shrink-0">
                      <UserAvatar user={actor} className="size-8" />
                      <span
                        className={cn(
                          "border-card absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2",
                          meta.dot
                        )}
                        aria-hidden
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <span className="font-medium">
                          {actor?.name ?? "Someone"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {VERB[notification.kind] ?? "updated this"}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {incident && (
                          <PriorityBadge
                            priority={incident.priority}
                            showDot={false}
                          />
                        )}
                        <span className="text-muted-foreground truncate text-xs">
                          {notification.message}
                        </span>
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-muted-foreground text-[11px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.at), {
                          addSuffix: true,
                        })}
                      </span>
                      {unreadItem && (
                        <span
                          className="bg-primary size-2 rounded-full"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {shown.length === 0 && (
          <div className="px-6 py-16 text-center">
            <BellOff className="text-muted-foreground mx-auto size-5" />
            <p className="mt-3 text-sm font-medium">
              {filter === "unread" ? "Nothing unread" : "No notifications yet"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              You will hear about incidents assigned to you, replies on ones you
              own, and any comment that mentions you.
            </p>
          </div>
        )}
      </Card>

      {items.some((n) => n.readAt) && user && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearRead(user.id)}
            className="text-muted-foreground"
          >
            <Trash2 className="size-4" />
            Clear read
          </Button>
        </div>
      )}
    </div>
  );
}
