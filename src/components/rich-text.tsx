"use client";

import * as React from "react";
import { Check, Copy, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttachmentUrl } from "@/hooks/use-attachment-url";
import {
  attachmentIdFromSrc,
  isAttachmentSrc,
  parseRichText,
  type Inline,
} from "@/lib/richtext";

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="group bg-muted/60 relative overflow-hidden rounded-lg border">
      <div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[10px]">
        <span className="font-mono tracking-wide uppercase">
          {lang || "text"}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5">
        <code className="font-mono text-[12px] leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

function InlineImage({ alt, src }: { alt: string; src: string }) {
  const attachmentId = isAttachmentSrc(src) ? attachmentIdFromSrc(src) : null;
  const resolved = useAttachmentUrl(attachmentId ?? "", !!attachmentId);
  const url = attachmentId ? resolved : src;

  if (!url) {
    return (
      <span className="text-muted-foreground my-1 inline-flex items-center gap-1.5 rounded border border-dashed px-2 py-1 text-xs">
        <ImageOff className="size-3" />
        {alt || "image unavailable"}
      </span>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
      {/* Blob URLs have no intrinsic loader, so next/image would add nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-h-80 w-auto max-w-full rounded-lg border transition-opacity hover:opacity-90"
      />
    </a>
  );
}

function renderInline(inline: Inline, key: number) {
  switch (inline.type) {
    case "text":
      return <React.Fragment key={key}>{inline.value}</React.Fragment>;
    case "break":
      return <br key={key} />;
    case "code":
      return (
        <code
          key={key}
          className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {inline.value}
        </code>
      );
    case "strong":
      return <strong key={key}>{inline.value}</strong>;
    case "em":
      return <em key={key}>{inline.value}</em>;
    case "link":
      return (
        <a
          key={key}
          href={inline.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2"
        >
          {inline.text}
        </a>
      );
    case "image":
      return <InlineImage key={key} alt={inline.alt} src={inline.src} />;
  }
}

/**
 * Renders the rich-text subset as React elements. Nothing here goes through
 * dangerouslySetInnerHTML, so pasted text cannot introduce markup.
 */
export function RichText({
  source,
  className,
  empty = "Nothing captured.",
}: {
  source: string;
  className?: string;
  empty?: string;
}) {
  const blocks = React.useMemo(() => parseRichText(source), [source]);

  if (blocks.length === 0) {
    return <p className={cn("text-muted-foreground text-sm", className)}>{empty}</p>;
  }

  return (
    <div className={cn("space-y-2.5 text-sm leading-relaxed", className)}>
      {blocks.map((block, index) =>
        block.type === "code" ? (
          <CodeBlock key={index} lang={block.lang} code={block.code} />
        ) : (
          <p key={index} className="break-words whitespace-pre-line">
            {block.inlines.map(renderInline)}
          </p>
        )
      )}
    </div>
  );
}
