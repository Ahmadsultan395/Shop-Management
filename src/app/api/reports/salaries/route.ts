import { NextRequest } from "next/server";
import { getSalaryReport } from "@/lib/db/reports";
import { resolveDateRange, dateRangeToMonthRange, type DateRangePreset } from "@/lib/dateRange";
import { jsonOk } from "@/lib/utils";
import type { SalaryStatus } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") as DateRangePreset) ?? "all";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");
  const { monthFrom, monthTo } = dateRangeToMonthRange(resolveDateRange(range, customFrom, customTo));

  const employeeId = searchParams.get("employeeId");
  const status = (searchParams.get("status") as SalaryStatus | "all") ?? "all";

  const report = getSalaryReport({
    monthFrom,
    monthTo,
    employeeId: employeeId ? Number(employeeId) : undefined,
    status,
  });

  return jsonOk({ ...report, monthFrom, monthTo });
}
