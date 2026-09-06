import { getDb } from "./index";
import type { SalaryRecord, SalaryStatus } from "@/types";
import { listActiveEmployees } from "./employees";

export function computeStatus(salaryAmount: number, paidAmount: number): SalaryStatus {
  if (paidAmount <= 0) return "pending";
  if (paidAmount >= salaryAmount) return "paid";
  return "partial";
}

export interface SalaryRecordInput {
  employee_id: number;
  salary_month: string; // YYYY-MM
  salary_amount: number;
  paid_amount: number;
  payment_date?: string | null;
  notes?: string | null;
}

export interface SalaryListParams {
  employeeId?: number;
  month?: string; // YYYY-MM
  year?: string; // YYYY
  status?: SalaryStatus | "all";
}

export interface SalaryListRow extends SalaryRecord {
  employee_name: string;
}

export function listSalaryRecords(params: SalaryListParams = {}): SalaryListRow[] {
  const { employeeId, month, year, status } = params;
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (employeeId) {
    clauses.push("sr.employee_id = ?");
    args.push(employeeId);
  }
  if (month) {
    clauses.push("sr.salary_month = ?");
    args.push(month);
  }
  if (year) {
    clauses.push("substr(sr.salary_month, 1, 4) = ?");
    args.push(year);
  }
  if (status && status !== "all") {
    clauses.push("sr.status = ?");
    args.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT sr.*, e.name AS employee_name
       FROM salary_records sr
       JOIN employees e ON e.id = sr.employee_id
       ${where}
       ORDER BY sr.salary_month DESC, e.name COLLATE NOCASE ASC`
    )
    .all(...args) as SalaryListRow[];
}

export function getSalaryRecordById(id: number): SalaryRecord | undefined {
  return getDb().prepare(`SELECT * FROM salary_records WHERE id = ?`).get(id) as
    | SalaryRecord
    | undefined;
}

export function salaryRecordExists(employeeId: number, month: string, excludeId?: number): boolean {
  const row = excludeId
    ? getDb()
        .prepare(`SELECT id FROM salary_records WHERE employee_id = ? AND salary_month = ? AND id != ?`)
        .get(employeeId, month, excludeId)
    : getDb()
        .prepare(`SELECT id FROM salary_records WHERE employee_id = ? AND salary_month = ?`)
        .get(employeeId, month);
  return Boolean(row);
}

export function createSalaryRecord(input: SalaryRecordInput): SalaryRecord {
  const remaining = Math.round((input.salary_amount - input.paid_amount) * 100) / 100;
  const status = computeStatus(input.salary_amount, input.paid_amount);

  const result = getDb()
    .prepare(
      `INSERT INTO salary_records
        (employee_id, salary_month, salary_amount, paid_amount, remaining_amount, payment_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.employee_id,
      input.salary_month,
      input.salary_amount,
      input.paid_amount,
      remaining,
      input.payment_date || null,
      status,
      input.notes || null
    );
  return getSalaryRecordById(Number(result.lastInsertRowid))!;
}

export function updateSalaryRecord(id: number, input: SalaryRecordInput): SalaryRecord {
  const remaining = Math.round((input.salary_amount - input.paid_amount) * 100) / 100;
  const status = computeStatus(input.salary_amount, input.paid_amount);

  getDb()
    .prepare(
      `UPDATE salary_records
       SET employee_id = ?, salary_month = ?, salary_amount = ?, paid_amount = ?,
           remaining_amount = ?, payment_date = ?, status = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.employee_id,
      input.salary_month,
      input.salary_amount,
      input.paid_amount,
      remaining,
      input.payment_date || null,
      status,
      input.notes || null,
      id
    );
  return getSalaryRecordById(id)!;
}

/** Creates a "pending" record for the given month for every active employee that doesn't already have one. */
export function generateMonthlyRecords(month: string): number {
  const employees = listActiveEmployees();
  let created = 0;
  for (const emp of employees) {
    if (!salaryRecordExists(emp.id, month)) {
      createSalaryRecord({
        employee_id: emp.id,
        salary_month: month,
        salary_amount: emp.monthly_salary,
        paid_amount: 0,
      });
      created++;
    }
  }
  return created;
}

export interface EmployeeSalarySummary {
  totalSalary: number;
  totalPaid: number;
  totalRemaining: number;
}

export function getEmployeeSalarySummary(employeeId: number, year?: string): EmployeeSalarySummary {
  const clauses = ["employee_id = ?"];
  const args: unknown[] = [employeeId];
  if (year) {
    clauses.push("substr(salary_month, 1, 4) = ?");
    args.push(year);
  }
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(salary_amount), 0) AS totalSalary,
              COALESCE(SUM(paid_amount), 0) AS totalPaid,
              COALESCE(SUM(remaining_amount), 0) AS totalRemaining
       FROM salary_records WHERE ${clauses.join(" AND ")}`
    )
    .get(...args) as EmployeeSalarySummary;
  return row;
}

export function getEmployeeSalaryHistory(employeeId: number, year?: string): SalaryRecord[] {
  const clauses = ["employee_id = ?"];
  const args: unknown[] = [employeeId];
  if (year) {
    clauses.push("substr(salary_month, 1, 4) = ?");
    args.push(year);
  }
  return getDb()
    .prepare(
      `SELECT * FROM salary_records WHERE ${clauses.join(" AND ")} ORDER BY salary_month DESC`
    )
    .all(...args) as SalaryRecord[];
}

export function getAvailableSalaryYears(): string[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT substr(salary_month, 1, 4) AS year FROM salary_records ORDER BY year DESC`)
    .all() as { year: string }[];
  return rows.map((r) => r.year);
}
