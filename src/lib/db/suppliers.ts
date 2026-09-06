import { getDb } from "./index";
import type { Supplier } from "@/types";

export interface SupplierListParams {
  search?: string;
  status?: "all" | "active" | "inactive";
}

export function listSuppliers(params: SupplierListParams = {}): Supplier[] {
  const { search, status = "active" } = params;
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (status === "active") clauses.push("is_active = 1");
  if (status === "inactive") clauses.push("is_active = 0");
  if (search && search.trim()) {
    clauses.push("(name LIKE ? OR phone LIKE ?)");
    args.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM suppliers ${where} ORDER BY name COLLATE NOCASE ASC`)
    .all(...args) as Supplier[];
}

export function getSupplierById(id: number): Supplier | undefined {
  return getDb().prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id) as Supplier | undefined;
}

export function supplierNameExists(name: string, excludeId?: number): boolean {
  const row = excludeId
    ? getDb()
        .prepare(`SELECT id FROM suppliers WHERE name = ? COLLATE NOCASE AND id != ?`)
        .get(name.trim(), excludeId)
    : getDb().prepare(`SELECT id FROM suppliers WHERE name = ? COLLATE NOCASE`).get(name.trim());
  return Boolean(row);
}

export function createSupplier(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}): Supplier {
  const result = getDb()
    .prepare(
      `INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)`
    )
    .run(input.name.trim(), input.phone || null, input.address || null, input.notes || null);
  return getSupplierById(Number(result.lastInsertRowid))!;
}

export function updateSupplier(
  id: number,
  input: { name: string; phone?: string | null; address?: string | null; notes?: string | null }
): Supplier {
  getDb()
    .prepare(
      `UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(input.name.trim(), input.phone || null, input.address || null, input.notes || null, id);
  return getSupplierById(id)!;
}

export function setSupplierActive(id: number, active: boolean): void {
  getDb()
    .prepare(`UPDATE suppliers SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(active ? 1 : 0, id);
}

export interface SupplierPurchaseSummary {
  totalAmount: number;
  purchaseCount: number;
}

export function getSupplierPurchaseSummary(
  id: number,
  from: string | null,
  to: string | null
): SupplierPurchaseSummary {
  const clauses = ["supplier_id = ?", "is_void = 0"];
  const args: unknown[] = [id];
  if (from) {
    clauses.push("purchase_date >= ?");
    args.push(from);
  }
  if (to) {
    clauses.push("purchase_date <= ?");
    args.push(to);
  }
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(grand_total), 0) AS totalAmount, COUNT(*) AS purchaseCount
       FROM purchases WHERE ${clauses.join(" AND ")}`
    )
    .get(...args) as SupplierPurchaseSummary;
  return row;
}

export interface SupplierPurchaseRow {
  id: number;
  purchase_date: string;
  reference_no: string | null;
  grand_total: number;
  item_count: number;
}

export function getSupplierPurchaseHistory(
  id: number,
  from: string | null,
  to: string | null
): SupplierPurchaseRow[] {
  const clauses = ["p.supplier_id = ?", "p.is_void = 0"];
  const args: unknown[] = [id];
  if (from) {
    clauses.push("p.purchase_date >= ?");
    args.push(from);
  }
  if (to) {
    clauses.push("p.purchase_date <= ?");
    args.push(to);
  }
  return getDb()
    .prepare(
      `SELECT p.id, p.purchase_date, p.reference_no, p.grand_total,
              (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
       FROM purchases p
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.purchase_date DESC, p.id DESC`
    )
    .all(...args) as SupplierPurchaseRow[];
}
