import { getDb } from "./index";
import type { Employee } from "@/types";

export interface EmployeeListParams {
  search?: string;
  status?: "all" | "active" | "inactive";
}

export function listEmployees(params: EmployeeListParams = {}): Employee[] {
  const { search, status = "active" } = params;
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (status === "active") clauses.push("is_active = 1");
  if (status === "inactive") clauses.push("is_active = 0");
  if (search && search.trim()) {
    clauses.push("(name LIKE ? OR phone LIKE ? OR designation LIKE ?)");
    args.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM employees ${where} ORDER BY name COLLATE NOCASE ASC`)
    .all(...args) as Employee[];
}

export function listActiveEmployees(): Employee[] {
  return listEmployees({ status: "active" });
}

export function getEmployeeById(id: number): Employee | undefined {
  return getDb().prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as Employee | undefined;
}

export interface EmployeeInput {
  name: string;
  phone?: string | null;
  designation?: string | null;
  joining_date?: string | null;
  salary_start_date?: string | null;
  monthly_salary: number;
  salary_due_day?: number | null;
  notes?: string | null;
}

export function createEmployee(input: EmployeeInput): Employee {
  const result = getDb()
    .prepare(
      `INSERT INTO employees
        (name, phone, designation, joining_date, salary_start_date, monthly_salary, salary_due_day, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name.trim(),
      input.phone || null,
      input.designation || null,
      input.joining_date || null,
      input.salary_start_date || null,
      input.monthly_salary,
      input.salary_due_day || null,
      input.notes || null
    );
  return getEmployeeById(Number(result.lastInsertRowid))!;
}

export function updateEmployee(id: number, input: EmployeeInput): Employee {
  getDb()
    .prepare(
      `UPDATE employees
       SET name = ?, phone = ?, designation = ?, joining_date = ?, salary_start_date = ?,
           monthly_salary = ?, salary_due_day = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.name.trim(),
      input.phone || null,
      input.designation || null,
      input.joining_date || null,
      input.salary_start_date || null,
      input.monthly_salary,
      input.salary_due_day || null,
      input.notes || null,
      id
    );
  return getEmployeeById(id)!;
}

export function setEmployeeActive(id: number, active: boolean): void {
  getDb()
    .prepare(`UPDATE employees SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(active ? 1 : 0, id);
}
