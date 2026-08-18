"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-card";
import { SEVERITY_META, type Severity } from "@/lib/types";
import { formatDuration } from "@/lib/metrics";

const AXIS = {
  stroke: "var(--axis)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const GRID = {
  stroke: "var(--grid)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Reported vs resolved per day — two series, one shared y-axis. */
export function TrendChart({
  data,
}: {
  data: { date: string; reported: number; resolved: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -6 }}>
        <defs>
          <linearGradient id="fillReported" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" {...AXIS} interval="preserveStartEnd" minTickGap={28} />
        <YAxis {...AXIS} allowDecimals={false} width={34} />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <ChartTooltip
                label={label as string}
                rows={(payload as readonly TooltipPayloadEntry[]).map((entry) => ({
                  name: String(entry.name),
                  value: String(entry.value),
                  color: entry.color,
                }))}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="reported"
          name="Reported"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#fillReported)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#fillResolved)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Severity mix — status colors, always beside their SEV label. */
export function SeverityChart({
  data,
}: {
  data: { severity: Severity; count: number; open: number; fill: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="grid gap-3 px-3 py-1">
      {data.map((row) => (
        <div key={row.severity} className="grid gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className="size-2 rounded-[2px]"
                style={{ background: row.fill }}
                aria-hidden
              />
              {row.severity}
              <span className="text-muted-foreground font-normal">
                {SEVERITY_META[row.severity].blurb}
              </span>
            </span>
            <span className="tabular-nums">
              {row.count}
              <span className="text-muted-foreground">
                {" "}
                · {row.open} open
              </span>
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${(row.count / max) * 100}%`,
                background: row.fill,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Weekly mean time to resolve — a single series, so no legend box. */
export function MttrChart({
  data,
}: {
  data: { week: string; hours: number; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: -6 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="week" {...AXIS} />
        <YAxis {...AXIS} width={46} unit="h" />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = (payload as readonly TooltipPayloadEntry[])[0]
              ?.payload as unknown as { hours: number; count: number };
            return (
              <ChartTooltip
                label={`Week of ${label}`}
                rows={[
                  {
                    name: "Mean time to resolve",
                    value: formatDuration(point.hours * 60),
                    color: "var(--chart-1)",
                  },
                  { name: "Incidents resolved", value: point.count },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="hours"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Incident volume by service — magnitude, so one hue at one step. */
export function ServiceChart({
  data,
}: {
  data: { service: string; total: number; open: number; mttrHours: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 0, left: 8 }}
        barCategoryGap={8}
      >
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="service"
          {...AXIS}
          width={150}
          tick={{ fontSize: 11, fill: "var(--axis)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = (payload as readonly TooltipPayloadEntry[])[0]
              ?.payload as unknown as {
              service: string;
              total: number;
              open: number;
              mttrHours: number;
            };
            return (
              <ChartTooltip
                label={point.service}
                rows={[
                  { name: "Incidents", value: point.total, color: "var(--chart-1)" },
                  { name: "Still open", value: point.open },
                  {
                    name: "Mean time to resolve",
                    value: point.mttrHours ? `${point.mttrHours}h` : "—",
                  },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((entry) => (
            <Cell key={entry.service} fill="var(--chart-1)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
