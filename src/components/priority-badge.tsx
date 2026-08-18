import { cn } from "@/lib/utils";
import { PRIORITY_META, type Priority } from "@/lib/types";

/**
 * Priority is a status signal, so it always ships as dot + label. The label
 * stays in ink (P3 yellow as text would not clear contrast on white).
 */
export function PriorityBadge({
  priority,
  className,
  showDot = true,
}: {
  priority: Priority;
  className?: string;
  showDot?: boolean;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-tight",
        meta.className,
        className
      )}
      title={meta.blurb}
    >
      {showDot && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: meta.chart }}
          aria-hidden
        />
      )}
      {priority}
    </span>
  );
}
