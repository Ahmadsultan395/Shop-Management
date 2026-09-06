import { NextRequest } from "next/server";
import { listEmployees, createEmployee } from "@/lib/db/employees";
import { jsonError, jsonOk, isNonEmptyString, isNonNegativeNumber } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as "all" | "active" | "inactive") ?? "active";
  const employees = listEmployees({ search, status });
  return jsonOk({ employees });
}

export async function POST(req: NextRequest) {
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

  const employee = createEmployee({
    name: name as string,
    phone: phone as string,
    designation: designation as string,
    joining_date: joining_date as string,
    salary_start_date: salary_start_date as string,
    monthly_salary: Number(monthly_salary),
    salary_due_day: salary_due_day ? Number(salary_due_day) : null,
    notes: notes as string,
  });
  return jsonOk({ employee }, 201);
}
