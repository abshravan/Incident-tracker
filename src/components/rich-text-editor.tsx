"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bold, Code2, Eye, ImagePlus, Italic, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import {
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  putAttachment,
} from "@/lib/attachments";
import { ATTACHMENT_SCHEME } from "@/lib/richtext";
import type { Attachment } from "@/lib/types";

function newAttachmentId() {
  return `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Plain-text editor over the rich-text subset: paste or pick an image and it is
 * stored in IndexedDB and referenced inline, and the toolbar wraps a selection
 * in a code fence. Deliberately not a WYSIWYG — the stored value stays readable
 * text that a real backend can accept unchanged.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  placeholder,
  rows = 5,
  className,
  autoFocus,
  onSubmitShortcut,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (next: Attachment[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
  onSubmitShortcut?: () => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  /** Replaces the current selection and restores the caret after it. */
  function replaceSelection(
    build: (selected: string) => { text: string; caretOffset?: number }
  ) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const { text, caretOffset } = build(selected);
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    const caret = start + (caretOffset ?? text.length);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function wrap(marker: string) {
    replaceSelection((selected) =>
      selected
        ? { text: `${marker}${selected}${marker}` }
        : { text: `${marker}${marker}`, caretOffset: marker.length }
    );
  }

  function insertCodeBlock() {
    replaceSelection((selected) => {
      if (selected) return { text: "```\n" + selected + "\n```\n" };
      return { text: "```\n\n```\n", caretOffset: 4 };
    });
  }

  const insertImages = React.useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      const skipped = files.length - images.length;
      if (skipped > 0) {
        toast.error("Only images can be inserted here", {
          description: "Use the attachments field for other file types.",
        });
      }

      const added: Attachment[] = [];
      let markdown = "";
      for (const file of images) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} is too large`, {
            description: `The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)} per image.`,
          });
          continue;
        }
        const attachmentId = newAttachmentId();
        try {
          await putAttachment(attachmentId, file);
        } catch {
          toast.error(`Could not store ${file.name}`);
          continue;
        }
        const name = file.name || "screenshot";
        added.push({
          id: attachmentId,
          name,
          size: file.size,
          type: file.type,
          addedAt: new Date().toISOString(),
        });
        markdown += `\n![${name}](${ATTACHMENT_SCHEME}${attachmentId})\n`;
      }

      if (added.length === 0) return;
      onAttachmentsChange([...attachments, ...added]);
      replaceSelection(() => ({ text: markdown }));
    },
    // replaceSelection closes over the latest value through render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attachments, onAttachmentsChange, value]
  );

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bold"
          onClick={() => wrap("**")}
          disabled={preview}
        >
          <Bold className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Italic"
          onClick={() => wrap("*")}
          disabled={preview}
        >
          <Italic className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Code block"
          onClick={insertCodeBlock}
          disabled={preview}
        >
          <Code2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Insert image"
          onClick={() => fileRef.current?.click()}
          disabled={preview}
        >
          <ImagePlus className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? (
            <>
              <Pencil className="size-3.5" /> Write
            </>
          ) : (
            <>
              <Eye className="size-3.5" /> Preview
            </>
          )}
        </Button>
      </div>

      {preview ? (
        <div className="border-input min-h-24 rounded-md border px-3 py-2.5">
          <RichText source={value} empty="Nothing to preview yet." />
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmitShortcut?.();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              // Keep the window-level picker listener from storing it again.
              e.stopPropagation();
              void insertImages(files);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              e.preventDefault();
              void insertImages(files);
            }
            setDragging(false);
          }}
          className={cn(
            "border-input placeholder:text-muted-foreground min-h-24 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-[13px] shadow-sm transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            dragging && "border-primary bg-primary/5"
          )}
        />
      )}

      <p className="text-muted-foreground text-[11px]">
        Paste or drop a screenshot to embed it. Use{" "}
        <code className="bg-muted rounded px-1 py-0.5 font-mono">```</code> for a
        code block.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void insertImages(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
