"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { ThemeToggle } from "./theme-toggle";
import { Sidebar } from "./sidebar";
import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { useAuth } from "@/lib/auth";
import { useIncidentStore } from "@/lib/store";

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const incidents = useIncidentStore((s) => s.incidents);
  const router = useRouter();

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = incidents
      .slice()
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    if (!q) return pool.slice(0, 6);
    return pool
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.key.toLowerCase().includes(q) ||
          i.labels.some((l) => l.includes(q))
      )
      .slice(0, 8);
  }, [incidents, query]);

  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-xl">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="text-muted-foreground size-4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents by title, key or label…"
            className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
          />
          <kbd className="text-muted-foreground hidden rounded border px-1.5 py-0.5 text-[10px] sm:block">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Nothing matches “{query}”.
            </p>
          )}
          {results.map((incident) => (
            <button
              key={incident.id}
              onClick={() => {
                handleOpenChange(false);
                router.push(`/incidents/${incident.id}`);
              }}
              className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-3 py-2 text-left"
            >
              <span className="text-muted-foreground w-16 shrink-0 font-mono text-[11px]">
                {incident.key}
              </span>
              <span className="flex-1 truncate text-sm">{incident.title}</span>
              <PriorityBadge priority={incident.priority} showDot={false} />
              <StatusBadge status={incident.status} className="hidden sm:flex" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Topbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileNav(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>

        <button
          onClick={() => setPaletteOpen(true)}
          className="text-muted-foreground hover:bg-accent/60 flex h-9 flex-1 items-center gap-2 rounded-lg border px-3 text-sm transition-colors sm:max-w-sm"
        >
          <Search className="size-4" />
          <span className="truncate">Search incidents…</span>
          <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <CreateIncidentDialog />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:ring-ring/40 rounded-full transition-shadow hover:ring-2">
                <UserAvatar user={user} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span>{user?.name}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  signOut();
                  router.replace("/login");
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="bg-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                onClick={() => setMobileNav(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </Button>
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
