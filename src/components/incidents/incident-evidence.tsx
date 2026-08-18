"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, Download, FileText, PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAttachmentUrl } from "@/hooks/use-attachment-url";
import { formatBytes, isImage } from "@/lib/attachments";
import type { Attachment } from "@/lib/types";

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy to clipboard"
      className="bg-muted hover:bg-accent group inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] transition-colors"
    >
      {value}
      {copied ? (
        <Check className="size-3 text-[#006300] dark:text-[#0ca30c]" />
      ) : (
        <Copy className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function CallIdGroup({ label, ids }: { label: string; ids: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">
        {label}
        <span className="ml-1.5 tabular-nums">({ids.length})</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <CopyableId key={id} value={id} />
        ))}
      </div>
    </div>
  );
}

function AttachmentTile({ attachment }: { attachment: Attachment }) {
  const url = useAttachmentUrl(attachment.id);
  const image = isImage(attachment.type);

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => {
        if (!url) {
          event.preventDefault();
          toast.error("That file is no longer in this browser's storage.");
        }
      }}
      className="group hover:bg-accent/60 block overflow-hidden rounded-lg border transition-colors"
    >
      <div className="bg-muted grid aspect-video place-items-center overflow-hidden">
        {image && url ? (
          // Blob URLs have no intrinsic loader, so next/image would add nothing.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={attachment.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <FileText className="text-muted-foreground size-5" />
        )}
      </div>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">
            {attachment.name}
          </span>
          <span className="text-muted-foreground text-[11px]">
            {formatBytes(attachment.size)}
          </span>
        </span>
        <Download className="text-muted-foreground size-3.5 shrink-0" />
      </div>
    </a>
  );
}

/** Call ids and attachments captured with the report. */
export function IncidentEvidence({
  botCallIds,
  voicestackCallIds,
  attachments,
}: {
  botCallIds: string[];
  voicestackCallIds: string[];
  attachments: Attachment[];
}) {
  const hasCallIds = botCallIds.length > 0 || voicestackCallIds.length > 0;
  if (!hasCallIds && attachments.length === 0) return null;

  return (
    <Card className="px-5 py-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
        <PhoneCall className="size-3.5" />
        Evidence
      </h2>

      {hasCallIds && (
        <div className="mt-3 grid gap-3">
          {botCallIds.length > 0 && (
            <CallIdGroup label="Bot call IDs" ids={botCallIds} />
          )}
          {voicestackCallIds.length > 0 && (
            <CallIdGroup label="VoiceStack call IDs" ids={voicestackCallIds} />
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-4">
          <p className="text-muted-foreground text-xs">
            Screenshots and files
            <span className="ml-1.5 tabular-nums">({attachments.length})</span>
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {attachments.map((attachment) => (
              <AttachmentTile key={attachment.id} attachment={attachment} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
