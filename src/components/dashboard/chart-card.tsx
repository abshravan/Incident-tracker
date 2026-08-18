"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";

export interface LegendSeries {
  label: string;
  color: string;
}

export function ChartCard({
  title,
  description,
  series,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  series?: LegendSeries[];
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={cn("min-w-0", className)}>
      <Card className="h-full">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>

        {/* A legend is always present for two or more series. */}
        {series && series.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pt-3">
            {series.map((s) => (
              <span
                key={s.label}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2 rounded-[2px]"
                  style={{ background: s.color }}
                  aria-hidden
                />
                {s.label}
              </span>
            ))}
          </div>
        )}

        <div className="px-2 pt-4 pb-4">{children}</div>
      </Card>
    </motion.div>
  );
}

/** Shared tooltip surface so every chart in the app reads the same way. */
export function ChartTooltip({
  label,
  rows,
}: {
  label?: React.ReactNode;
  rows: { name: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div className="bg-popover/95 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <p className="mb-1.5 font-medium">{label}</p>}
      <div className="grid gap-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-3">
            {row.color && (
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: row.color }}
                aria-hidden
              />
            )}
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
