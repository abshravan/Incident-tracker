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
import { ATTACHMENT_SCHEME, formatMention } from "@/lib/richtext";
import { useIncidentStore } from "@/lib/store";
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

  const users = useIncidentStore((s) => s.users);
  // An open "@" run immediately before the caret drives the mention menu.
  const [mention, setMention] = React.useState<{
    query: string;
    start: number;
  } | null>(null);
  const [highlighted, setHighlighted] = React.useState(0);

  const matches = React.useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return users
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().startsWith(q)
      )
      .slice(0, 5);
  }, [mention, users]);

  /** Opens the menu when the caret sits in an "@…" run, closes it otherwise. */
  function syncMention(text: string, caret: number) {
    const upto = text.slice(0, caret);
    // Only after a boundary, so an email address does not open the menu.
    const found = /(^|[\s(])@([\p{L}\p{N}._-]*)$/u.exec(upto);
    if (!found) {
      setMention(null);
      return;
    }
    setMention({ query: found[2], start: caret - found[2].length - 1 });
    setHighlighted(0);
  }

  function insertMention(user: (typeof users)[number]) {
    const el = ref.current;
    if (!el || !mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const token = formatMention(user.name, user.id) + " ";
    onChange(before + token + after);
    setMention(null);
    const caret = before.length + token.length;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

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
        <div className="relative">
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            syncMention(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) =>
            syncMention(value, e.currentTarget.selectionStart ?? 0)
          }
          onBlur={() => window.setTimeout(() => setMention(null), 120)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (mention && matches.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((h) => (h + 1) % matches.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted(
                  (h) => (h - 1 + matches.length) % matches.length
                );
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(matches[highlighted]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
                return;
              }
            }
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

        {mention && matches.length > 0 && (
          <div className="bg-popover absolute bottom-full left-2 z-20 mb-1 w-60 overflow-hidden rounded-lg border p-1 shadow-lg">
            {matches.map((u, index) => (
              <button
                key={u.id}
                type="button"
                // The textarea blurs before click lands, so commit on mousedown.
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  index === highlighted && "bg-accent"
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: u.avatarColor }}
                  aria-hidden
                />
                <span className="flex-1 truncate font-medium">{u.name}</span>
                <span className="text-muted-foreground truncate">{u.team}</span>
              </button>
            ))}
          </div>
        )}
        </div>
      )}

      <p className="text-muted-foreground text-[11px]">
        Type <code className="bg-muted rounded px-1 py-0.5 font-mono">@</code> to
        mention someone. Paste or drop a screenshot to embed it. Use{" "}
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
