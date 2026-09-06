import { cn } from "@/lib/utils";

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn("badge", active ? "bg-stamp-green/10 text-stamp-green" : "bg-ink-soft/10 text-ink-soft")}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
