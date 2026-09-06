import { NextRequest } from "next/server";
import { getEmployeeById, updateEmployee, setEmployeeActive } from "@/lib/db/employees";
import { jsonError, jsonOk, isNonEmptyString, isNonNegativeNumber } from "@/lib/utils";

export const runtime = "nodejs";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid employee id.", 400);
  const employee = getEmployeeById(id);
  if (!employee) return jsonError("Employee not found.", 404);
  return jsonOk({ employee });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid employee id.", 400);
  const existing = getEmployeeById(id);
  if (!existing) return jsonError("Employee not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const {
    name,
    phone,
    designation,
    joining_date,
    salary_start_date,
    monthly_salary,
    salary_due_day,
    notes,
  } = body as Record<string, unknown>;

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(name)) fields.name = "Employee name is required.";
  if (!isNonNegativeNumber(monthly_salary)) fields.monthly_salary = "Enter a valid monthly salary.";
  if (
    salary_due_day !== undefined &&
    salary_due_day !== null &&
    salary_due_day !== "" &&
    (!Number.isInteger(Number(salary_due_day)) || Number(salary_due_day) < 1 || Number(salary_due_day) > 31)
  ) {
    fields.salary_due_day = "Salary due day must be between 1 and 31.";
  }
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const employee = updateEmployee(id, {
    name: name as string,
    phone: phone as string,
    designation: designation as string,
    joining_date: joining_date as string,
    salary_start_date: salary_start_date as string,
    monthly_salary: Number(monthly_salary),
    salary_due_day: salary_due_day ? Number(salary_due_day) : null,
    notes: notes as string,
  });
  return jsonOk({ employee });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid employee id.", 400);
  const existing = getEmployeeById(id);
  if (!existing) return jsonError("Employee not found.", 404);

  const body = await req.json().catch(() => null);
  const { is_active } = (body ?? {}) as { is_active?: boolean };
  if (typeof is_active !== "boolean") return jsonError("is_active must be true or false.");

  setEmployeeActive(id, is_active);
  return jsonOk({ employee: getEmployeeById(id) });
}
