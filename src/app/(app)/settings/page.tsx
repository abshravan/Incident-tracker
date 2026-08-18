"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Database, LogOut, Palette, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMounted } from "@/hooks/use-mounted";
import { useCan } from "@/hooks/use-can";
import { ROLE_META } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import { PRIORITY_META, PRIORITIES } from "@/lib/types";
import { formatDuration } from "@/lib/metrics";

export default function SettingsPage() {
  const { user, users, signIn, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const incidents = useIncidentStore((s) => s.incidents);
  const events = useIncidentStore((s) => s.events);
  const resetDemoData = useIncidentStore((s) => s.resetDemoData);
  const router = useRouter();
  const mounted = useMounted();
  const canResetData = useCan("reset-demo-data");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="Appearance, demo data, and the auth stub"
      />

      <motion.div variants={stagger()} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={fadeUp}>
          <Card className="px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" />
              Session
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Auth is a stub: the session is a user id in localStorage, with no
              password check and no server. Replace{" "}
              <code className="bg-muted rounded px-1 py-0.5">src/lib/auth.tsx</code>{" "}
              to wire up a real provider.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <UserAvatar user={user} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {user?.name}
                  {user && (
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                        ROLE_META[user.role].className
                      )}
                      title={ROLE_META[user.role].blurb}
                    >
                      {ROLE_META[user.role].label}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  signOut();
                  router.replace("/login");
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-1.5">
              <label className="text-muted-foreground text-xs">
                Switch demo account
              </label>
              <Select
                value={user?.id ?? ""}
                onValueChange={(v) => {
                  signIn(v);
                  toast.success("Switched account");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {ROLE_META[u.role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="size-4" />
              Appearance
            </h2>
            <div className="mt-3 grid gap-1.5">
              <label className="text-muted-foreground text-xs">Theme</label>
              <Select
                value={mounted ? (theme ?? "system") : "system"}
                onValueChange={setTheme}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Match system</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="px-5 py-4">
            <h2 className="text-sm font-semibold">Priority targets</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Each priority carries its own response window. The board and
              incident pages track how much of it is left.
            </p>
            <div className="mt-3 grid gap-2">
              {PRIORITIES.map((priority) => (
                <div
                  key={priority}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: PRIORITY_META[priority].chart }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium">{priority}</span>
                  <span className="text-muted-foreground text-xs">
                    {PRIORITY_META[priority].blurb}
                  </span>
                  <span className="ml-auto text-xs font-medium tabular-nums">
                    {formatDuration(PRIORITY_META[priority].targetMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {canResetData && (
        <motion.div variants={fadeUp}>
          <Card className="px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Database className="size-4" />
              Demo data
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {incidents.length} incidents and {events.length} timeline entries
              live in this browser&apos;s localStorage. Resetting rebuilds the
              seed dataset and discards anything you created.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                resetDemoData();
                toast.success("Demo data reset");
              }}
            >
              Reset demo data
            </Button>
          </Card>
        </motion.div>
        )}
      </motion.div>
    </div>
  );
}
