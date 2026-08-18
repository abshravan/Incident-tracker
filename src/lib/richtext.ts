/**
 * A deliberately small markdown subset for incident descriptions and comments:
 * fenced code blocks, inline code, images, links, bold and italic.
 *
 * It is parsed to tokens and rendered as React elements (see
 * src/components/rich-text.tsx) — never as raw HTML — so pasted text cannot
 * inject markup. Links and images are additionally restricted to schemes we
 * trust, which is what keeps `javascript:` out of an href.
 */

export type Inline =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "link"; text: string; href: string }
  | { type: "image"; alt: string; src: string }
  | { type: "break" };

export type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "paragraph"; inlines: Inline[] };

/** Attachment references use this scheme; the id resolves against IndexedDB. */
export const ATTACHMENT_SCHEME = "att:";

const FENCE = /```([a-zA-Z0-9+#._-]*)[ \t]*\r?\n([\s\S]*?)```/g;

const INLINE =
  /(`[^`\n]+`)|(!\[[^\]]*\]\([^)\s]*\))|(\[[^\]\n]+\]\([^)\s]*\))|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/g;

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

export function isAttachmentSrc(src: string) {
  return src.startsWith(ATTACHMENT_SCHEME);
}

export function attachmentIdFromSrc(src: string) {
  return src.slice(ATTACHMENT_SCHEME.length);
}

/** Only schemes that cannot execute script survive as real links. */
function safeHref(href: string) {
  return SAFE_LINK.test(href.trim()) ? href.trim() : null;
}

function safeImageSrc(src: string) {
  const trimmed = src.trim();
  if (isAttachmentSrc(trimmed)) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function parseInlines(source: string): Inline[] {
  const out: Inline[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    // Newlines inside a paragraph are soft breaks.
    const parts = value.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) out.push({ type: "break" });
      if (part) out.push({ type: "text", value: part });
    });
  };

  let lastIndex = 0;
  INLINE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE.exec(source)) !== null) {
    pushText(source.slice(lastIndex, match.index));
    const token = match[0];

    if (token.startsWith("`")) {
      out.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("![")) {
      const alt = token.slice(2, token.indexOf("]"));
      const raw = token.slice(token.indexOf("](") + 2, -1);
      const src = safeImageSrc(raw);
      if (src) out.push({ type: "image", alt, src });
      else pushText(token);
    } else if (token.startsWith("[")) {
      const text = token.slice(1, token.indexOf("]"));
      const raw = token.slice(token.indexOf("](") + 2, -1);
      const href = safeHref(raw);
      // A rejected link renders as its literal source, so the reader can see
      // exactly what was written rather than a plausible-looking fragment.
      if (href) out.push({ type: "link", text, href });
      else pushText(token);
    } else if (token.startsWith("**")) {
      out.push({ type: "strong", value: token.slice(2, -2) });
    } else {
      out.push({ type: "em", value: token.slice(1, -1) });
    }

    lastIndex = match.index + token.length;
  }

  pushText(source.slice(lastIndex));
  return out;
}

export function parseRichText(source: string): Block[] {
  if (!source.trim()) return [];
  const blocks: Block[] = [];

  const pushProse = (chunk: string) => {
    for (const paragraph of chunk.split(/\n{2,}/)) {
      if (!paragraph.trim()) continue;
      const inlines = parseInlines(paragraph.replace(/^\n+|\n+$/g, ""));
      if (inlines.length > 0) blocks.push({ type: "paragraph", inlines });
    }
  };

  let lastIndex = 0;
  FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE.exec(source)) !== null) {
    pushProse(source.slice(lastIndex, match.index));
    blocks.push({
      type: "code",
      lang: match[1] ?? "",
      code: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }

  pushProse(source.slice(lastIndex));
  return blocks;
}

/** Ids of attachments rendered inline, so callers can avoid listing them twice. */
export function referencedAttachmentIds(source: string): Set<string> {
  const ids = new Set<string>();
  for (const block of parseRichText(source)) {
    if (block.type !== "paragraph") continue;
    for (const inline of block.inlines) {
      if (inline.type === "image" && isAttachmentSrc(inline.src)) {
        ids.add(attachmentIdFromSrc(inline.src));
      }
    }
  }
  return ids;
}
