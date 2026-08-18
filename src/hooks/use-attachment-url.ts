"use client";

import * as React from "react";
import { getAttachment } from "@/lib/attachments";

/**
 * Resolves an attachment id to an object URL for previewing, and revokes it on
 * unmount so the blob does not leak.
 */
export function useAttachmentUrl(id: string, enabled = true) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    getAttachment(id)
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // A missing blob just renders as a plain file chip.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, enabled]);

  return url;
}
