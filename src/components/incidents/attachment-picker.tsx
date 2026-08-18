"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { FileText, ImageIcon, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isImage,
  putAttachment,
  deleteAttachment,
} from "@/lib/attachments";
import { useAttachmentUrl } from "@/hooks/use-attachment-url";
import type { Attachment } from "@/lib/types";

function Thumb({ attachment }: { attachment: Attachment }) {
  const url = useAttachmentUrl(attachment.id, isImage(attachment.type));

  if (url) {
    return (
      // Blob URLs have no intrinsic loader, so next/image would add nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="size-9 shrink-0 rounded object-cover"
      />
    );
  }
  return (
    <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded">
      {isImage(attachment.type) ? (
        <ImageIcon className="size-4" />
      ) : (
        <FileText className="size-4" />
      )}
    </span>
  );
}

/**
 * Picks screenshots and files, writing the bytes straight to IndexedDB and
 * handing back only metadata for the incident record.
 */
export function AttachmentPicker({
  value,
  onChange,
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const addFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const accepted: Attachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} is too large`, {
            description: `The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)} per file.`,
          });
          continue;
        }
        const id = `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        try {
          await putAttachment(id, file);
        } catch {
          toast.error(`Could not store ${file.name}`);
          continue;
        }
        accepted.push({
          id,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          addedAt: new Date().toISOString(),
        });
      }
      if (accepted.length > 0) onChange([...value, ...accepted]);
    },
    [value, onChange]
  );

  // A screenshot is usually on the clipboard, not on disk.
  React.useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) {
        event.preventDefault();
        void addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  function remove(attachment: Attachment) {
    void deleteAttachment(attachment.id);
    onChange(value.filter((a) => a.id !== attachment.id));
  }

  return (
    <div className="grid gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed px-4 py-4 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:bg-accent/40"
        )}
      >
        <Upload className="text-muted-foreground mx-auto size-4" />
        <p className="mt-1.5 text-xs">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-primary font-medium hover:underline"
          >
            Choose files
          </button>{" "}
          <span className="text-muted-foreground">
            or drop them here — you can paste a screenshot too
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Up to {formatBytes(MAX_ATTACHMENT_BYTES)} per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {value.map((attachment) => (
          <motion.div
            key={attachment.id}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="flex items-center gap-2.5 rounded-lg border px-2 py-1.5"
          >
            <Thumb attachment={attachment} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {attachment.name}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {formatBytes(attachment.size)}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${attachment.name}`}
              onClick={() => remove(attachment)}
            >
              <X className="size-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {value.length > 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Paperclip className="size-3" />
          {value.length} file{value.length === 1 ? "" : "s"} attached
        </p>
      )}
    </div>
  );
}
