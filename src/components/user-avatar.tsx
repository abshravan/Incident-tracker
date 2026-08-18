import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  user,
  className,
}: {
  user?: User | null;
  className?: string;
}) {
  if (!user) {
    return (
      <Avatar className={cn("border border-dashed", className)}>
        <AvatarFallback className="text-muted-foreground bg-transparent text-[10px]">
          ?
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar className={cn(className)} title={`${user.name} · ${user.team}`}>
      <AvatarFallback
        className="text-[10px] font-semibold text-white"
        style={{ background: user.avatarColor }}
      >
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
