"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function YearFilter({ years }: { years: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeYear = searchParams.get("year") ?? "all";

  function setYear(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (year === "all") params.delete("year");
    else params.set("year", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  const options = ["all", ...years];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((y) => (
        <button
          key={y}
          onClick={() => setYear(y)}
          className={cn(
            "rounded-sm border px-3 py-1.5 text-xs font-medium transition",
            activeYear === y
              ? "border-ledger bg-ledger text-white"
              : "border-paper-line bg-white text-ink-soft hover:bg-paper"
          )}
        >
          {y === "all" ? "All Years" : y}
        </button>
      ))}
    </div>
  );
}
