import { NextRequest } from "next/server";
import { getSalaryRecordById, updateSalaryRecord } from "@/lib/db/salaries";
import { validateSalaryInput } from "@/lib/validation/salary";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid salary record id.", 400);
  const record = getSalaryRecordById(id);
  if (!record) return jsonError("Salary record not found.", 404);
  return jsonOk({ record });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid salary record id.", 400);
  const existing = getSalaryRecordById(id);
  if (!existing) return jsonError("Salary record not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");

  const result = validateSalaryInput(body, id);
  if (!result.ok) return jsonError(result.message!, 400, result.fields);

  const record = updateSalaryRecord(id, result.value!);
  return jsonOk({ record });
}
