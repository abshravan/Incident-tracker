"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useIncidentStore } from "@/lib/store";

/** The signed-in user's inbox, newest first, plus the unread count. */
export function useNotifications() {
  const { user } = useAuth();
  const notifications = useIncidentStore((s) => s.notifications);

  return React.useMemo(() => {
    const mine = notifications
      .filter((n) => n.userId === user?.id)
      .sort((a, b) => +new Date(b.at) - +new Date(a.at));
    return { items: mine, unread: mine.filter((n) => !n.readAt).length };
  }, [notifications, user?.id]);
}
