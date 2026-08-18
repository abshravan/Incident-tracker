"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CallIdInput } from "./call-id-input";
import { AttachmentPicker } from "./attachment-picker";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  IMPACT_META,
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  type Attachment,
  type Impact,
  type IncidentStatus,
  type Priority,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { referencedAttachmentIds } from "@/lib/richtext";

const ENV_SUGGESTIONS = ["prod-us-east-1", "prod-eu-west-1", "staging", "dev"];

export function CreateIncidentDialog({
  trigger,
  defaultStatus = "triage",
}: {
  trigger?: React.ReactNode;
  defaultStatus?: IncidentStatus;
}) {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const services = useIncidentStore((s) => s.services);
  const users = useIncidentStore((s) => s.users);
  const createIncident = useIncidentStore((s) => s.createIncident);
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("P3");
  const [impact, setImpact] = React.useState<Impact>("minor");
  const [status, setStatus] = React.useState<IncidentStatus>(defaultStatus);
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "frontend");
  const [env, setEnv] = React.useState("");
  const [botCallIds, setBotCallIds] = React.useState<string[]>([]);
  const [voicestackCallIds, setVoicestackCallIds] = React.useState<string[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [reporterId, setReporterId] = React.useState<string>(user?.id ?? "");
  const [assigneeId, setAssigneeId] = React.useState<string>("unassigned");

  // A screenshot embedded in the description already renders there, so the
  // file list below shows only the attachments that are not inline.
  const inlineIds = React.useMemo(
    () => referencedAttachmentIds(description),
    [description]
  );
  const galleryAttachments = attachments.filter((a) => !inlineIds.has(a.id));

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("P3");
    setImpact("minor");
    setStatus(defaultStatus);
    setServiceId(services[0]?.id ?? "frontend");
    setEnv("");
    setBotCallIds([]);
    setVoicestackCallIds([]);
    setAttachments([]);
    setReporterId(user?.id ?? "");
    setAssigneeId("unassigned");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim()) return;

    const incident = createIncident(
      {
        title,
        description,
        priority,
        impact,
        serviceId,
        status,
        env,
        botCallIds,
        voicestackCallIds,
        attachments,
        reporterId: reporterId || user.id,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      },
      user.id
    );

    setOpen(false);
    reset();
    toast.success(`${incident.key} reported`, {
      description: incident.title,
      action: {
        label: "Open",
        onClick: () => router.push(`/incidents/${incident.id}`),
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
        else setReporterId(user?.id ?? "");
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Report incident
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>
            Capture what is broken now — you can refine priority and impact as
            the picture gets clearer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              autoFocus
              required
              placeholder="Bot dropped the call after the transfer prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">What is happening?</Label>
            <RichTextEditor
              id="description"
              rows={12}
              minHeight={260}
              placeholder="Symptoms, blast radius, first signal, anything already ruled out."
              value={description}
              onChange={setDescription}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>

          <div className="grid gap-2">
            <Label>Priority</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRIORITIES.map((p) => {
                const meta = PRIORITY_META[p];
                const active = priority === p;
                return (
                  <motion.button
                    key={p}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "relative rounded-lg border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-transparent"
                        : "hover:bg-accent/50 border-border"
                    )}
                    style={
                      active
                        ? {
                            background: `color-mix(in oklab, ${meta.chart} 14%, transparent)`,
                            boxShadow: `inset 0 0 0 1.5px ${meta.chart}`,
                          }
                        : undefined
                    }
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: meta.chart }}
                        aria-hidden
                      />
                      {p}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-[11px] leading-tight">
                      {meta.blurb}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Affected service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="env">ENV</Label>
              <Input
                id="env"
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                placeholder="prod-us-east-1"
                list="env-suggestions"
              />
              <datalist id="env-suggestions">
                {ENV_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label>Customer impact</Label>
              <Select
                value={impact}
                onValueChange={(v) => setImpact(v as Impact)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(IMPACT_META) as Impact[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {IMPACT_META[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Starting column</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as IncidentStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="bot-call-ids">Bot call IDs</Label>
            <CallIdInput
              id="bot-call-ids"
              value={botCallIds}
              onChange={setBotCallIds}
              placeholder="Paste one or many — Enter or comma to add"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voicestack-call-ids">VoiceStack call IDs</Label>
            <CallIdInput
              id="voicestack-call-ids"
              value={voicestackCallIds}
              onChange={setVoicestackCallIds}
              placeholder="Paste one or many — Enter or comma to add"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Reporter</Label>
              <Select value={reporterId} onValueChange={setReporterId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Screenshots and files</Label>
            <AttachmentPicker
              value={galleryAttachments}
              onChange={(next) =>
                setAttachments([
                  ...attachments.filter((a) => inlineIds.has(a.id)),
                  ...next,
                ])
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create incident
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
