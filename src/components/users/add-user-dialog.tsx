"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { ROLE_META, assignableRoles } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export function AddUserDialog() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const users = useIncidentStore((s) => s.users);
  const createUser = useIncidentStore((s) => s.createUser);

  const roles = assignableRoles(user);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [team, setTeam] = React.useState("");
  const [role, setRole] = React.useState<Role>("user");

  const teams = React.useMemo(
    () => [...new Set(users.map((u) => u.team))].sort(),
    [users]
  );

  const duplicate =
    !!email.trim() &&
    users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  function reset() {
    setName("");
    setEmail("");
    setTeam("");
    setRole("user");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || duplicate) return;
    const created = createUser({ name, email, team, role });
    setOpen(false);
    reset();
    toast.success(`${created.name} added`, {
      description: `${ROLE_META[created.role].label} · ${created.team}`,
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
        <Button size="sm" className="gap-1.5">
          <UserPlus className="size-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            They can sign in immediately — this demo has no password step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rosa Alvarez"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-email">Work email</Label>
            <Input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rosa@acme.io"
              aria-invalid={duplicate || undefined}
            />
            {duplicate && (
              <p className="text-destructive text-xs">
                That email is already on the team.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-team">Team</Label>
            <Input
              id="user-team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="Platform"
              list="team-suggestions"
            />
            <datalist id="team-suggestions">
              {teams.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <Label>Access level</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_META[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[11px]">
              {ROLE_META[role].blurb}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !email.trim() || duplicate}
            >
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
