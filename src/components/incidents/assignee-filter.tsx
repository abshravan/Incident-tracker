"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useIncidentStore } from "@/lib/store";
import {
  ASSIGNEE_ALL,
  ASSIGNEE_MINE,
  ASSIGNEE_UNASSIGNED,
  type AssigneeFilter,
} from "@/lib/filters";
import { cn } from "@/lib/utils";

/** One control for "whose incidents am I looking at", used on board and list. */
export function AssigneeFilterSelect({
  value,
  onChange,
  size = "default",
  className,
}: {
  value: AssigneeFilter;
  onChange: (next: AssigneeFilter) => void;
  size?: "sm" | "default";
  className?: string;
}) {
  const users = useIncidentStore((s) => s.users);
  const { user } = useAuth();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size={size}
        className={cn("w-[190px]", className)}
        aria-label="Filter by assignee"
      >
        <SelectValue placeholder="Assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ASSIGNEE_ALL}>Anyone</SelectItem>
        {user && <SelectItem value={ASSIGNEE_MINE}>Assigned to me</SelectItem>}
        <SelectItem value={ASSIGNEE_UNASSIGNED}>Unassigned</SelectItem>
        <SelectSeparator />
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            <span className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: u.avatarColor }}
                aria-hidden
              />
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
