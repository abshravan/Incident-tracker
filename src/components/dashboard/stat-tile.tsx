"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

/** Counts up to `value` once the tile mounts. */
function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString()
  );

  React.useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{text}</motion.span>;
}

export function StatTile({
  label,
  value,
  numeric,
  format,
  hint,
  deltaPercent,
  deltaGoodWhen = "down",
  accent,
  icon: Icon,
}: {
  label: string;
  value?: string;
  numeric?: number;
  format?: (n: number) => string;
  hint?: string;
  deltaPercent?: number | null;
  deltaGoodWhen?: "up" | "down";
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const hasDelta = typeof deltaPercent === "number" && Number.isFinite(deltaPercent);
  const rising = hasDelta && deltaPercent! > 0.5;
  const falling = hasDelta && deltaPercent! < -0.5;
  const good = deltaGoodWhen === "up" ? rising : falling;
  const bad = deltaGoodWhen === "up" ? falling : rising;

  return (
    <motion.div variants={fadeUp}>
      <Card className="relative h-full overflow-hidden">
        {accent && (
          <span
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: accent }}
            aria-hidden
          />
        )}
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="mt-1.5 text-2xl leading-none font-semibold tracking-tight">
              {typeof numeric === "number" ? (
                <AnimatedNumber value={numeric} format={format} />
              ) : (
                value
              )}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {hasDelta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] font-medium",
                    good && "text-[#006300] dark:text-[#0ca30c]",
                    bad && "text-destructive",
                    !good && !bad && "text-muted-foreground"
                  )}
                >
                  {rising ? (
                    <ArrowUpRight className="size-3" />
                  ) : falling ? (
                    <ArrowDownRight className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {Math.abs(deltaPercent!).toFixed(0)}%
                </span>
              )}
              {hint && (
                <span className="text-muted-foreground text-[11px]">{hint}</span>
              )}
            </div>
          </div>
          {Icon && (
            <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg">
              <Icon className="size-4" />
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
