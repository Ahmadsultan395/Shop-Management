"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DATE_RANGE_OPTIONS, type DateRangePreset } from "@/lib/dateRange";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function DateRangeFilter({
  extraParams = {},
}: {
  /** Any other query params (e.g. search) that should be preserved when the range changes. */
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePreset = (searchParams.get("range") as DateRangePreset) || "all";
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function applyPreset(preset: DateRangePreset) {
    const params = new URLSearchParams();
    params.set("range", preset);
    Object.entries(extraParams).forEach(([k, v]) => v && params.set(k, v));
    if (preset === "custom" && customFrom && customTo) {
      params.set("from", customFrom);
      params.set("to", customTo);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => applyPreset(opt.value)}
          className={cn(
            "rounded-sm border px-3 py-1.5 text-xs font-medium transition",
            activePreset === opt.value
              ? "border-ledger bg-ledger text-white"
              : "border-paper-line bg-white text-ink-soft hover:bg-paper"
          )}
        >
          {opt.label}
        </button>
      ))}

      {activePreset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="field-input w-auto py-1.5 text-xs"
          />
          <span className="text-xs text-ink-soft">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="field-input w-auto py-1.5 text-xs"
          />
          <Button
            variant="secondary"
            className="py-1.5 text-xs"
            onClick={() => applyPreset("custom")}
            disabled={!customFrom || !customTo}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
