"use client";

import { useAuth } from "@/lib/auth";
import { can, type Capability } from "@/lib/permissions";

/** Capability check for the signed-in user. */
export function useCan(capability: Capability) {
  const { user } = useAuth();
  return can(user, capability);
}
