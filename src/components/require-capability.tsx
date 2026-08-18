"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { can, ROLE_META, type Capability } from "@/lib/permissions";

/** The level a refused page actually needs, so the message is not guesswork. */
const REQUIRED_LEVEL: Partial<Record<Capability, string>> = {
  "manage-admins": "Super admins only",
  "delete-users": "Super admins only",
};

/**
 * Route-level gate. Hiding the nav entry is not a control on its own — someone
 * can still type the URL — so the page itself checks the capability and
 * explains the refusal instead of rendering an empty screen.
 */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (can(user, capability)) return <>{children}</>;

  return (
    <div className="grid place-items-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="max-w-md px-6 py-6 text-center">
          <span className="bg-muted text-muted-foreground mx-auto grid size-10 place-items-center rounded-xl">
            <Lock className="size-4" />
          </span>
          <h1 className="mt-3 text-base font-semibold tracking-tight">
            {REQUIRED_LEVEL[capability] ?? "Admins only"}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            You are signed in as{" "}
            <span className="text-foreground font-medium">
              {user ? ROLE_META[user.role].label : "a guest"}
            </span>
            . Ask an admin for access, or switch to an admin account in
            Settings to explore this page.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/settings">Open settings</Link>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
