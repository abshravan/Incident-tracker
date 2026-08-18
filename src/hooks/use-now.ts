"use client";

import * as React from "react";

/**
 * A shared clock. Reading `Date.now()` during render is impure, and the response-clock bars
 * need to keep moving anyway, so time is modelled as an external store that
 * ticks once a minute.
 */
let current = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!timer) {
    timer = setInterval(() => {
      current = Date.now();
      for (const listener of listeners) listener();
    }, 60_000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  if (current === 0) current = Date.now();
  return current;
}

function getServerSnapshot() {
  return 0;
}

export function useNow() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
