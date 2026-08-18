import { differenceInMinutes, format, startOfDay, subDays } from "date-fns";
import type { Incident, Priority, IncidentStatus } from "./types";
import { PRIORITIES, PRIORITY_META, STATUSES } from "./types";

export const OPEN_STATUSES: IncidentStatus[] = [
  "triage",
  "investigating",
  "mitigating",
  "monitoring",
];

export const isOpen = (i: Incident) => i.status !== "resolved";

export function minutesBetween(a: string, b: string) {
  return Math.max(0, differenceInMinutes(new Date(b), new Date(a)));
}

export function formatDuration(minutes: number | null) {
  if (minutes === null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Mean time to acknowledge, in minutes. */
export function mtta(incidents: Incident[]) {
  return mean(
    incidents
      .filter((i) => i.acknowledgedAt)
      .map((i) => minutesBetween(i.createdAt, i.acknowledgedAt!))
  );
}

/** Mean time to resolve, in minutes. */
export function mttr(incidents: Incident[]) {
  return mean(
    incidents
      .filter((i) => i.resolvedAt)
      .map((i) => minutesBetween(i.createdAt, i.resolvedAt!))
  );
}

export function withinWindow(incidents: Incident[], days: number) {
  const cutoff = subDays(new Date(), days).getTime();
  return incidents.filter((i) => +new Date(i.createdAt) >= cutoff);
}

export function priorityBreakdown(incidents: Incident[]) {
  return PRIORITIES.map((priority) => ({
    priority,
    label: priority,
    count: incidents.filter((i) => i.priority === priority).length,
    open: incidents.filter((i) => i.priority === priority && isOpen(i)).length,
    fill: PRIORITY_META[priority].chart,
  }));
}

export function statusBreakdown(incidents: Incident[]) {
  return STATUSES.map((status) => ({
    status,
    count: incidents.filter((i) => i.status === status).length,
  }));
}

/** Daily reported vs resolved counts over the trailing `days` window. */
export function dailyTrend(incidents: Incident[], days = 30) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, idx) => {
    const day = subDays(today, days - 1 - idx);
    const next = new Date(day.getTime() + 86_400_000);
    const inDay = (iso: string | null) =>
      !!iso && +new Date(iso) >= +day && +new Date(iso) < +next;
    return {
      date: format(day, "MMM d"),
      iso: day.toISOString(),
      reported: incidents.filter((i) => inDay(i.createdAt)).length,
      resolved: incidents.filter((i) => inDay(i.resolvedAt)).length,
    };
  });
}

/** Weekly MTTR (hours) for the trailing `weeks` weeks. */
export function mttrTrend(incidents: Incident[], weeks = 8) {
  return Array.from({ length: weeks }, (_, idx) => {
    const end = subDays(new Date(), (weeks - 1 - idx) * 7);
    const start = subDays(end, 7);
    const bucket = incidents.filter(
      (i) => i.resolvedAt && +new Date(i.resolvedAt) >= +start && +new Date(i.resolvedAt) < +end
    );
    const value = mttr(bucket);
    return {
      week: format(start, "MMM d"),
      hours: value === null ? 0 : Number((value / 60).toFixed(1)),
      count: bucket.length,
    };
  });
}

export function serviceBreakdown(
  incidents: Incident[],
  services: { id: string; name: string }[]
) {
  return services
    .map((service) => {
      const forService = incidents.filter((i) => i.serviceId === service.id);
      return {
        service: service.name,
        total: forService.length,
        open: forService.filter(isOpen).length,
        mttrHours: (() => {
          const value = mttr(forService);
          return value === null ? 0 : Number((value / 60).toFixed(1));
        })(),
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** How much of the priority response target an open incident has burned, 0..1+. */
export function targetBurn(incident: Incident, now = Date.now()) {
  const elapsed = (now - +new Date(incident.createdAt)) / 60_000;
  const budget = PRIORITY_META[incident.priority].targetMinutes;
  return elapsed / budget;
}

export function isPastTarget(incident: Incident, now = Date.now()) {
  return isOpen(incident) && targetBurn(incident, now) >= 1;
}

export function priorityCounts(incidents: Incident[]) {
  return PRIORITIES.reduce<Record<Priority, number>>(
    (acc, p) => {
      acc[p] = incidents.filter((i) => i.priority === p).length;
      return acc;
    },
    { P1: 0, P2: 0, P3: 0, P4: 0 }
  );
}

/** Percent change of `current` vs `previous`, null when there is no baseline. */
export function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
