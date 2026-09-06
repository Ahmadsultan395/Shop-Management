import { NextRequest } from "next/server";
import { listSalaryRecords, createSalaryRecord, generateMonthlyRecords } from "@/lib/db/salaries";
import { validateSalaryInput } from "@/lib/validation/salary";
import { jsonError, jsonOk, isValidYearMonth } from "@/lib/utils";
import type { SalaryStatus } from "@/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month") ?? undefined;
  const year = searchParams.get("year") ?? undefined;
  const status = (searchParams.get("status") as SalaryStatus | "all") ?? "all";

  const records = listSalaryRecords({
    employeeId: employeeId ? Number(employeeId) : undefined,
    month,
    year,
    status,
  });
  return jsonOk({ records });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");

  // Convenience bulk action: create pending records for every active
  // employee for a given month, skipping ones that already exist.
  if (body.action === "generate") {
    if (!isValidYearMonth(body.month)) return jsonError("Provide a valid month (YYYY-MM).");
    const created = generateMonthlyRecords(body.month);
    return jsonOk({ created });
  }

  const result = validateSalaryInput(body);
  if (!result.ok) return jsonError(result.message!, 400, result.fields);

  const record = createSalaryRecord(result.value!);
  return jsonOk({ record }, 201);
}
