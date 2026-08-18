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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  IMPACT_META,
  SEVERITIES,
  SEVERITY_META,
  STATUSES,
  STATUS_META,
  type Impact,
  type IncidentStatus,
  type Severity,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL_SUGGESTIONS = [
  "regression",
  "deploy",
  "third-party",
  "capacity",
  "security",
  "data",
  "customer-reported",
  "config",
];

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
  const [severity, setSeverity] = React.useState<Severity>("SEV3");
  const [impact, setImpact] = React.useState<Impact>("minor");
  const [status, setStatus] = React.useState<IncidentStatus>(defaultStatus);
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "s1");
  const [assigneeId, setAssigneeId] = React.useState<string>("unassigned");
  const [labels, setLabels] = React.useState<string[]>([]);

  function reset() {
    setTitle("");
    setDescription("");
    setSeverity("SEV3");
    setImpact("minor");
    setStatus(defaultStatus);
    setServiceId(services[0]?.id ?? "s1");
    setAssigneeId("unassigned");
    setLabels([]);
  }

  function toggleLabel(label: string) {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim()) return;

    const incident = createIncident(
      {
        title,
        description,
        severity,
        impact,
        serviceId,
        status,
        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
        labels,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>
            Capture what is broken now — you can refine severity and impact as
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
              placeholder="Checkout returning 5xx for EU customers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">What is happening?</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Symptoms, blast radius, first signal, anything already ruled out."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Severity</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEVERITIES.map((s) => {
                const meta = SEVERITY_META[s];
                const active = severity === s;
                return (
                  <motion.button
                    key={s}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSeverity(s)}
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
                      {s}
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

          <div className="grid gap-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_SUGGESTIONS.map((label) => {
                const active = labels.includes(label);
                return (
                  <motion.button
                    key={label}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => toggleLabel(label)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
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
