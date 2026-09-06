import type { SalaryStatus } from "@/types";
import { cn } from "@/lib/utils";

const LABEL: Record<SalaryStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
};

export function StatusBadge({ status }: { status: SalaryStatus }) {
  return (
    <span className={cn("badge", `badge-${status}`)}>{LABEL[status]}</span>
  );
}
