"use client";

import * as React from "react";

const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** True only after hydration — for UI that cannot be rendered on the server. */
export function useMounted() {
  return React.useSyncExternalStore(noop, onClient, onServer);
}
