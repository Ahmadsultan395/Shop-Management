import { getDb } from "./index";
import { currentMonth } from "@/lib/utils";

export interface DashboardStats {
  totalSuppliers: number;
  totalProducts: number;
  totalEmployees: number;
  thisMonthPurchase: number;
  thisYearPurchase: number;
  thisMonthSalary: number;
  pendingSalary: number;
}

export interface RecentPurchaseRow {
  id: number;
  purchase_date: string;
  supplier_name: string;
  grand_total: number;
}

export interface PendingSalaryRow {
  id: number;
  employee_name: string;
  salary_month: string;
  remaining_amount: number;
  status: "pending" | "partial" | "paid";
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const month = currentMonth(); // YYYY-MM
  const year = month.slice(0, 4);

  const totalSuppliers = (
    db.prepare(`SELECT COUNT(*) AS c FROM suppliers WHERE is_active = 1`).get() as { c: number }
  ).c;
  const totalProducts = (
    db.prepare(`SELECT COUNT(*) AS c FROM products WHERE is_active = 1`).get() as { c: number }
  ).c;
  const totalEmployees = (
    db.prepare(`SELECT COUNT(*) AS c FROM employees WHERE is_active = 1`).get() as { c: number }
  ).c;

  const thisMonthPurchase = (
    db
      .prepare(
        `SELECT COALESCE(SUM(grand_total), 0) AS total FROM purchases
         WHERE is_void = 0 AND strftime('%Y-%m', purchase_date) = ?`
      )
      .get(month) as { total: number }
  ).total;

  const thisYearPurchase = (
    db
      .prepare(
        `SELECT COALESCE(SUM(grand_total), 0) AS total FROM purchases
         WHERE is_void = 0 AND strftime('%Y', purchase_date) = ?`
      )
      .get(year) as { total: number }
  ).total;

  const thisMonthSalary = (
    db
      .prepare(`SELECT COALESCE(SUM(salary_amount), 0) AS total FROM salary_records WHERE salary_month = ?`)
      .get(month) as { total: number }
  ).total;

  const pendingSalary = (
    db
      .prepare(
        `SELECT COALESCE(SUM(remaining_amount), 0) AS total FROM salary_records WHERE status != 'paid'`
      )
      .get() as { total: number }
  ).total;

  return {
    totalSuppliers,
    totalProducts,
    totalEmployees,
    thisMonthPurchase,
    thisYearPurchase,
    thisMonthSalary,
    pendingSalary,
  };
}

export function getRecentPurchases(limit = 5): RecentPurchaseRow[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.purchase_date, p.grand_total, s.name AS supplier_name
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.is_void = 0
       ORDER BY p.purchase_date DESC, p.id DESC
       LIMIT ?`
    )
    .all(limit) as RecentPurchaseRow[];
}

export function getPendingOrPartialSalaries(limit = 5): PendingSalaryRow[] {
  return getDb()
    .prepare(
      `SELECT sr.id, sr.salary_month, sr.remaining_amount, sr.status, e.name AS employee_name
       FROM salary_records sr
       JOIN employees e ON e.id = sr.employee_id
       WHERE sr.status != 'paid'
       ORDER BY sr.salary_month DESC
       LIMIT ?`
    )
    .all(limit) as PendingSalaryRow[];
}
