"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";

function LoginCard() {
  const { users, signIn, signInWithEmail, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = React.useState("ava@acme.io");

  React.useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, router, next]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    signInWithEmail(email);
    router.replace(next);
  }

  return (
    <motion.div
      variants={stagger(0.05, 0.06)}
      initial="hidden"
      animate="show"
      className="w-full max-w-md"
    >
      <motion.div variants={fadeUp} className="mb-8 flex items-center gap-3">
        <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl shadow-sm">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold tracking-tight">Sentinel</p>
          <p className="text-muted-foreground text-sm">Incident tracker</p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="bg-card rounded-2xl border p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Demo auth — any email works, no password required.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@acme.io"
            />
          </div>
          <Button type="submit" className="w-full gap-1.5">
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
            or pick a demo account
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-1.5">
          {users.slice(0, 4).map((u) => (
            <motion.button
              key={u.id}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                signIn(u.id);
                router.replace(next);
              }}
              className="hover:bg-accent flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
            >
              <UserAvatar user={u} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {u.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs capitalize">
                  {u.role} · {u.team}
                </span>
              </span>
              <ArrowRight className="text-muted-foreground size-4" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.p
        variants={fadeUp}
        className="text-muted-foreground mt-5 text-center text-xs"
      >
        Sessions are stored in localStorage. Swap <code>src/lib/auth.tsx</code>{" "}
        for a real provider when you are ready.
      </motion.p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <React.Suspense
          fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
        >
          <LoginCard />
        </React.Suspense>
      </div>

      <div className="bg-muted/40 relative hidden overflow-hidden border-l lg:block">
        <div className="grid-noise absolute inset-0 opacity-60" />
        <div className="from-primary/15 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <div className="relative flex h-full flex-col justify-center gap-8 p-14">
          {[
            {
              icon: Zap,
              title: "From page to postmortem",
              body: "Report in seconds, run the response on a kanban board, and keep the timeline as your record.",
            },
            {
              icon: ShieldCheck,
              title: "Priority that means something",
              body: "P1–P4 carry their own response clocks, and the board flags anything burning through its budget.",
            },
            {
              icon: AlertTriangle,
              title: "Numbers your team trusts",
              body: "MTTA, MTTR, reported-vs-resolved and per-service reliability, recomputed as you work.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.15 + index * 0.12,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex max-w-md gap-4"
            >
              <span className="bg-background grid size-10 shrink-0 place-items-center rounded-xl border shadow-sm">
                <item.icon className="text-primary size-4.5" />
              </span>
              <div>
                <p className="font-medium tracking-tight">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
