"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function IndexPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span className="border-muted-foreground/30 border-t-foreground size-4 animate-spin rounded-full border-2" />
        Loading Sentinel…
      </div>
    </div>
  );
}
