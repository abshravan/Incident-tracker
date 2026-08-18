"use client";

import * as React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Lock, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequireCapability } from "@/components/require-capability";
import { AddUserDialog } from "@/components/users/add-user-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIncidentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  ROLE_META,
  ROLE_ORDER,
  assignableRoles,
  canDeleteUser,
  canDemote,
  canEditUser,
} from "@/lib/permissions";
import { isOpen } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/lib/types";

function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.className
      )}
      title={meta.blurb}
    >
      {role === "superadmin" && <ShieldCheck className="size-3" />}
      {meta.label}
    </span>
  );
}

export default function UsersPage() {
  return (
    <RequireCapability capability="manage-users">
      <UsersContent />
    </RequireCapability>
  );
}

function UsersContent() {
  const { user: me } = useAuth();
  const users = useIncidentStore((s) => s.users);
  const incidents = useIncidentStore((s) => s.incidents);
  const updateUserRole = useIncidentStore((s) => s.updateUserRole);
  const deleteUser = useIncidentStore((s) => s.deleteUser);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const roles = assignableRoles(me);

  const rows = React.useMemo(
    () =>
      users
        .slice()
        .sort(
          (a, b) =>
            ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
            a.name.localeCompare(b.name)
        ),
    [users]
  );

  const openFor = React.useCallback(
    (id: string) =>
      incidents.filter((i) => i.assigneeId === id && isOpen(i)).length,
    [incidents]
  );

  function changeRole(target: User, next: Role) {
    if (!canDemote(target, next, users)) {
      toast.error("That is the last super admin", {
        description: "Promote someone else first so the tier is never empty.",
      });
      return;
    }
    updateUserRole(target.id, next);
    toast.success(`${target.name} is now ${ROLE_META[next].label}`);
  }

  function remove(target: User) {
    const open = openFor(target.id);
    deleteUser(target.id);
    setPendingDelete(null);
    toast.success(`${target.name} removed`, {
      description: open
        ? `${open} open incident${open === 1 ? "" : "s"} returned to unassigned`
        : "Their history stays on the incidents they touched",
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Users"
        description="Add people, set what they can reach, and remove accounts that have moved on"
        actions={<AddUserDialog />}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="w-[130px]">Team</TableHead>
              <TableHead className="w-[110px]">Open work</TableHead>
              <TableHead className="w-[190px]">Access level</TableHead>
              <TableHead className="w-[70px] text-right">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const editable = canEditUser(me, row);
              const deletable = canDeleteUser(me, row, users);
              const isMe = row.id === me?.id;
              const confirming = pendingDelete === row.id;

              return (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-muted/40 border-b transition-colors last:border-0"
                >
                  <TableCell className="p-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={row} className="size-8" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {row.name}
                          {isMe && (
                            <span className="text-muted-foreground text-[10px]">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground p-3 text-xs">
                    {row.team}
                  </TableCell>

                  <TableCell className="p-3 text-xs tabular-nums">
                    {openFor(row.id) || "—"}
                  </TableCell>

                  <TableCell className="p-3">
                    {editable ? (
                      <Select
                        value={row.role}
                        onValueChange={(v) => changeRole(row, v as Role)}
                      >
                        <SelectTrigger size="sm" className="w-[170px]">
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
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1.5">
                            <RoleBadge role={row.role} />
                            <Lock className="text-muted-foreground size-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isMe
                            ? "You cannot change your own access level"
                            : "Only a super admin can change an admin"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  <TableCell className="p-3 text-right">
                    {deletable ? (
                      confirming ? (
                        <span className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(row)}
                          >
                            Remove
                          </Button>
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${row.name}`}
                          onClick={() => setPendingDelete(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="px-5 py-4">
        <h2 className="text-sm font-semibold">What each level reaches</h2>
        <dl className="mt-3 grid gap-2">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="flex items-start gap-3">
              <dt className="w-28 shrink-0">
                <RoleBadge role={role} />
              </dt>
              <dd className="text-muted-foreground text-xs leading-relaxed">
                {ROLE_META[role].blurb}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-3 text-[11px]">
          Nobody can change their own level, an admin cannot edit another admin,
          and the last super admin cannot be demoted or removed.
        </p>
      </Card>
    </div>
  );
}
