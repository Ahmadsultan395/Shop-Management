"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import { PurchaseReportTab } from "./PurchaseReportTab";
import { SalaryReportTab } from "./SalaryReportTab";

type Tab = "purchases" | "salaries";

export function ReportsClient({ shopName, currency }: { shopName: string; currency: string }) {
  const [tab, setTab] = useState<Tab>("purchases");

  return (
    <div>
      <PageHeader title="Reports" description="Purchase and salary reports with export." />

      <div className="no-print mb-4 flex gap-1">
        {(
          [
            { key: "purchases", label: "Purchase Report" },
            { key: "salaries", label: "Salary Report" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-sm border px-4 py-2 text-sm font-medium transition",
              tab === t.key
                ? "border-ledger bg-ledger text-white"
                : "border-paper-line bg-white text-ink-soft hover:bg-paper"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "purchases" ? (
        <PurchaseReportTab shopName={shopName} currency={currency} />
      ) : (
        <SalaryReportTab shopName={shopName} currency={currency} />
      )}
    </div>
  );
}
