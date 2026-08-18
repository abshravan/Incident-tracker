import { cn } from "@/lib/utils";
import { SEVERITY_META, type Severity } from "@/lib/types";

/**
 * Severity is a status signal, so it always ships as dot + label. The label
 * stays in ink (SEV3 yellow as text would not clear contrast on white).
 */
export function SeverityBadge({
  severity,
  className,
  showDot = true,
}: {
  severity: Severity;
  className?: string;
  showDot?: boolean;
}) {
  const meta = SEVERITY_META[severity];
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
      {severity}
    </span>
  );
}
