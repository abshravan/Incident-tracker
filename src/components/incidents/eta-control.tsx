"use client";

import * as React from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { canSetEta } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Incident } from "@/lib/types";

/** <input type="datetime-local"> wants local wall time, not an ISO instant. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EtaControl({
  incident,
  now,
  onChange,
}: {
  incident: Incident;
  now: number;
  onChange: (next: string | null) => void;
}) {
  const { user } = useAuth();
  const editable = canSetEta(user, incident);
  const eta = React.useMemo(
    () => (incident.eta ? new Date(incident.eta) : null),
    [incident.eta]
  );
  const resolved = !!incident.resolvedAt;

  const status = React.useMemo(() => {
    if (!eta) return null;
    if (resolved) {
      const met = +new Date(incident.resolvedAt!) <= +eta;
      return {
        tone: met ? "good" : "bad",
        text: met
          ? "Met — resolved before the ETA"
          : `Missed by ${formatDistanceToNowStrict(eta, {
              unit: "hour",
            })} at resolution`,
      } as const;
    }
    const overdue = +eta < now;
    return {
      tone: overdue ? "bad" : "neutral",
      text: overdue
        ? `${formatDistanceToNowStrict(eta)} overdue`
        : `in ${formatDistanceToNowStrict(eta)}`,
    } as const;
  }, [eta, now, resolved, incident.resolvedAt]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarClock className="size-3.5" />
          ETA
        </span>
        {eta && (
          <span
            className={cn(
              "text-[11px] font-medium",
              status?.tone === "bad" && "text-destructive",
              status?.tone === "good" && "text-[#006300] dark:text-[#0ca30c]",
              status?.tone === "neutral" && "text-muted-foreground"
            )}
          >
            {status?.text}
          </span>
        )}
      </div>

      {editable ? (
        <div className="flex items-center gap-1.5">
          <input
            type="datetime-local"
            aria-label="ETA"
            value={toLocalInput(incident.eta)}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent px-2 text-xs shadow-sm outline-none focus-visible:ring-[3px]"
          />
          {incident.eta && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear ETA"
              onClick={() => onChange(null)}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs">
          {eta ? (
            format(eta, "MMM d, HH:mm")
          ) : (
            <span className="text-muted-foreground">
              Not set — the assignee can add one
            </span>
          )}
        </p>
      )}
    </div>
  );
}
