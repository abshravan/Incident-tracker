"use client";

/**
 * Dummy auth: a session is just a user id in localStorage. There is no password
 * check and no server involved. Everything the app needs goes through
 * `useAuth()`, so swapping in a real provider (NextAuth, Clerk, your own API)
 * later means replacing this file and nothing else.
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";
import { USERS } from "./seed";
import type { User } from "./types";

const STORAGE_KEY = "incident-tracker/session";

// The session lives outside React so it can be read during render without an
// effect, and so every consumer re-renders together when it changes.
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSessionId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const getServerSessionId = () => null;

function setSessionId(id: string | null) {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private-mode browsers: the session just does not persist.
  }
  emit();
}

interface AuthContextValue {
  user: User | null;
  users: User[];
  /** False until hydration finishes — do not redirect before this is true. */
  ready: boolean;
  signIn: (userId: string) => void;
  signInWithEmail: (email: string) => User;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionId = React.useSyncExternalStore(
    subscribe,
    getSessionId,
    getServerSessionId
  );
  const ready = useMounted();

  const user = React.useMemo(
    () => USERS.find((u) => u.id === sessionId) ?? null,
    [sessionId]
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      users: USERS,
      ready,
      signIn: (userId: string) => {
        const found = USERS.find((u) => u.id === userId);
        if (found) setSessionId(found.id);
      },
      signInWithEmail: (email: string) => {
        const normalized = email.trim().toLowerCase();
        const found =
          USERS.find((u) => u.email.toLowerCase() === normalized) ?? USERS[0];
        setSessionId(found.id);
        return found;
      },
      signOut: () => setSessionId(null),
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Client-side route guard. Real auth would do this in middleware instead. */
export function useRequireAuth() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (ready && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  return { user, ready };
}
