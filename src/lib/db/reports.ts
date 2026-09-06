import { getDb } from "./index";

export interface PurchaseReportFilters {
  from?: string | null;
  to?: string | null;
  supplierId?: number;
  productId?: number;
}

export interface PurchaseReportRow {
  purchase_id: number;
  purchase_date: string;
  supplier_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  item_total: number;
}

export interface PurchaseReportTotals {
  totalQuantity: number;
  totalAmount: number;
}

export function getPurchaseReport(
  filters: PurchaseReportFilters
): { rows: PurchaseReportRow[]; totals: PurchaseReportTotals } {
  const clauses = ["p.is_void = 0"];
  const args: unknown[] = [];

  if (filters.from) {
    clauses.push("p.purchase_date >= ?");
    args.push(filters.from);
  }
  if (filters.to) {
    clauses.push("p.purchase_date <= ?");
    args.push(filters.to);
  }
  if (filters.supplierId) {
    clauses.push("p.supplier_id = ?");
    args.push(filters.supplierId);
  }
  if (filters.productId) {
    clauses.push("pi.product_id = ?");
    args.push(filters.productId);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = getDb()
    .prepare(
      `SELECT p.id AS purchase_id, p.purchase_date, s.name AS supplier_name, pr.name AS product_name,
              pi.quantity, pi.unit_price, pi.item_total
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       JOIN suppliers s ON s.id = p.supplier_id
       JOIN products pr ON pr.id = pi.product_id
       ${where}
       ORDER BY p.purchase_date DESC, p.id DESC`
    )
    .all(...args) as PurchaseReportRow[];

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalQuantity += r.quantity;
      acc.totalAmount += r.item_total;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0 }
  );

  return { rows, totals };
}

export interface SalaryReportFilters {
  monthFrom?: string | null; // YYYY-MM
  monthTo?: string | null; // YYYY-MM
  employeeId?: number;
  status?: "pending" | "partial" | "paid" | "all";
}

export interface SalaryReportRow {
  id: number;
  employee_name: string;
  salary_month: string;
  salary_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: "pending" | "partial" | "paid";
  payment_date: string | null;
}

export interface SalaryReportTotals {
  totalSalary: number;
  totalPaid: number;
  totalRemaining: number;
}

export function getSalaryReport(
  filters: SalaryReportFilters
): { rows: SalaryReportRow[]; totals: SalaryReportTotals } {
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (filters.monthFrom) {
    clauses.push("sr.salary_month >= ?");
    args.push(filters.monthFrom);
  }
  if (filters.monthTo) {
    clauses.push("sr.salary_month <= ?");
    args.push(filters.monthTo);
  }
  if (filters.employeeId) {
    clauses.push("sr.employee_id = ?");
    args.push(filters.employeeId);
  }
  if (filters.status && filters.status !== "all") {
    clauses.push("sr.status = ?");
    args.push(filters.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT sr.id, e.name AS employee_name, sr.salary_month, sr.salary_amount, sr.paid_amount,
              sr.remaining_amount, sr.status, sr.payment_date
       FROM salary_records sr
       JOIN employees e ON e.id = sr.employee_id
       ${where}
       ORDER BY sr.salary_month DESC, e.name COLLATE NOCASE ASC`
    )
    .all(...args) as SalaryReportRow[];

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalSalary += r.salary_amount;
      acc.totalPaid += r.paid_amount;
      acc.totalRemaining += r.remaining_amount;
      return acc;
    },
    { totalSalary: 0, totalPaid: 0, totalRemaining: 0 }
  );

  return { rows, totals };
}
