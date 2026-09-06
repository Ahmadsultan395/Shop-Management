import { getDb } from "./index";
import type { Product } from "@/types";

export interface ProductListParams {
  search?: string;
  status?: "all" | "active" | "inactive";
}

export function listProducts(params: ProductListParams = {}): Product[] {
  const { search, status = "active" } = params;
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (status === "active") clauses.push("is_active = 1");
  if (status === "inactive") clauses.push("is_active = 0");
  if (search && search.trim()) {
    clauses.push("(name LIKE ? OR category LIKE ?)");
    args.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`SELECT * FROM products ${where} ORDER BY name COLLATE NOCASE ASC`)
    .all(...args) as Product[];
}

export function getProductById(id: number): Product | undefined {
  return getDb().prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Product | undefined;
}

export function productNameExists(name: string, excludeId?: number): boolean {
  const row = excludeId
    ? getDb()
        .prepare(`SELECT id FROM products WHERE name = ? COLLATE NOCASE AND id != ?`)
        .get(name.trim(), excludeId)
    : getDb().prepare(`SELECT id FROM products WHERE name = ? COLLATE NOCASE`).get(name.trim());
  return Boolean(row);
}

export function createProduct(input: {
  name: string;
  category?: string | null;
  unit?: string | null;
  notes?: string | null;
}): Product {
  const result = getDb()
    .prepare(`INSERT INTO products (name, category, unit, notes) VALUES (?, ?, ?, ?)`)
    .run(input.name.trim(), input.category || null, input.unit || null, input.notes || null);
  return getProductById(Number(result.lastInsertRowid))!;
}

export function updateProduct(
  id: number,
  input: { name: string; category?: string | null; unit?: string | null; notes?: string | null }
): Product {
  getDb()
    .prepare(
      `UPDATE products SET name = ?, category = ?, unit = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(input.name.trim(), input.category || null, input.unit || null, input.notes || null, id);
  return getProductById(id)!;
}

export function setProductActive(id: number, active: boolean): void {
  getDb()
    .prepare(`UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(active ? 1 : 0, id);
}

export interface ProductPurchaseSummary {
  totalQuantity: number;
  totalAmount: number;
}

export function getProductPurchaseSummary(
  id: number,
  from: string | null,
  to: string | null
): ProductPurchaseSummary {
  const clauses = ["pi.product_id = ?", "p.is_void = 0"];
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
      `SELECT COALESCE(SUM(pi.quantity), 0) AS totalQuantity, COALESCE(SUM(pi.item_total), 0) AS totalAmount
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       WHERE ${clauses.join(" AND ")}`
    )
    .get(...args) as ProductPurchaseSummary;
}

export interface ProductPurchaseRow {
  id: number;
  purchase_date: string;
  supplier_name: string;
  quantity: number;
  unit_price: number;
  item_total: number;
}

export function getProductPurchaseHistory(
  id: number,
  from: string | null,
  to: string | null
): ProductPurchaseRow[] {
  const clauses = ["pi.product_id = ?", "p.is_void = 0"];
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
      `SELECT p.id, p.purchase_date, s.name AS supplier_name, pi.quantity, pi.unit_price, pi.item_total
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.purchase_date DESC, p.id DESC`
    )
    .all(...args) as ProductPurchaseRow[];
}

export function getProductSuppliers(id: number): { id: number; name: string }[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT s.id, s.name
       FROM purchase_items pi
       JOIN purchases p ON p.id = pi.purchase_id
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE pi.product_id = ? AND p.is_void = 0
       ORDER BY s.name COLLATE NOCASE ASC`
    )
    .all(id) as { id: number; name: string }[];
}
