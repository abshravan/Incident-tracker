"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Anything that separates ids when typing or pasting a batch. */
const SEPARATORS = /[\s,;]+/;

/**
 * Collects one or many ids. Type and press Enter, or paste a comma/newline
 * separated batch and every id lands as its own chip.
 */
export function CallIdInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  function commit(raw: string) {
    const parsed = raw
      .split(SEPARATORS)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;
    // Preserve entry order, drop ids already collected.
    const next = [...value];
    for (const candidate of parsed) {
      if (!next.includes(candidate)) next.push(candidate);
    }
    onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "border-input flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 text-sm shadow-sm transition-[color,box-shadow]",
        focused && "border-ring ring-ring/50 ring-[3px]",
        className
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.querySelector("input")?.focus();
        }
      }}
    >
      <AnimatePresence initial={false}>
        {value.map((callId) => (
          <motion.span
            key={callId}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px]"
          >
            {callId}
            <button
              type="button"
              aria-label={`Remove ${callId}`}
              onClick={() => onChange(value.filter((v) => v !== callId))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (SEPARATORS.test(text.trim())) {
            event.preventDefault();
            commit(text);
          }
        }}
        placeholder={value.length === 0 ? placeholder : "Add another…"}
        className="placeholder:text-muted-foreground min-w-[9rem] flex-1 bg-transparent px-1 py-0.5 outline-none"
      />
    </div>
  );
}
