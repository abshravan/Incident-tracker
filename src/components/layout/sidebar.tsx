"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidentStore } from "@/lib/store";
import { isOpen } from "@/lib/metrics";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/incidents", label: "Incidents", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const incidents = useIncidentStore((s) => s.incidents);
  const openCount = incidents.filter(isOpen).length;

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2.5 px-2 py-1"
      >
        <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm">
          <AlertTriangle className="size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Sentinel</span>
          <span className="text-muted-foreground text-[11px]">
            Incident tracker
          </span>
        </span>
      </Link>

      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="bg-sidebar-accent absolute inset-0 rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <Icon className="relative size-4 shrink-0" />
            <span className="relative">{item.label}</span>
            {item.href === "/incidents" && openCount > 0 && (
              <span className="bg-primary/10 text-primary relative ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {openCount}
              </span>
            )}
          </Link>
        );
      })}

      <div className="mt-auto px-2 pb-1">
        <div className="border-sidebar-border bg-sidebar-accent/50 rounded-lg border p-3">
          <p className="text-[11px] font-semibold">Demo mode</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            Auth is stubbed and data lives in your browser. Reset it any time
            from Settings.
          </p>
        </div>
      </div>
    </nav>
  );
}
