import { getDb } from "./index";
import type { Purchase, PurchaseItem } from "@/types";

export interface PurchaseItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface PurchaseInput {
  supplier_id: number;
  purchase_date: string;
  reference_no?: string | null;
  notes?: string | null;
  items: PurchaseItemInput[];
}

export interface PurchaseListParams {
  search?: string; // matches supplier name or reference number
  supplierId?: number;
  productId?: number;
  from?: string | null;
  to?: string | null;
  status?: "active" | "void" | "all";
}

export interface PurchaseListRow {
  id: number;
  purchase_date: string;
  supplier_id: number;
  supplier_name: string;
  reference_no: string | null;
  grand_total: number;
  item_count: number;
  is_void: 0 | 1;
}

export function listPurchases(params: PurchaseListParams = {}): PurchaseListRow[] {
  const { search, supplierId, productId, from, to, status = "active" } = params;
  const clauses: string[] = [];
  const args: unknown[] = [];

  if (status === "active") clauses.push("p.is_void = 0");
  if (status === "void") clauses.push("p.is_void = 1");

  if (search && search.trim()) {
    clauses.push("(s.name LIKE ? OR p.reference_no LIKE ?)");
    args.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (supplierId) {
    clauses.push("p.supplier_id = ?");
    args.push(supplierId);
  }
  if (from) {
    clauses.push("p.purchase_date >= ?");
    args.push(from);
  }
  if (to) {
    clauses.push("p.purchase_date <= ?");
    args.push(to);
  }
  if (productId) {
    clauses.push("EXISTS (SELECT 1 FROM purchase_items pi WHERE pi.purchase_id = p.id AND pi.product_id = ?)");
    args.push(productId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT p.id, p.purchase_date, p.supplier_id, s.name AS supplier_name, p.reference_no,
              p.grand_total, p.is_void,
              (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       ${where}
       ORDER BY p.purchase_date DESC, p.id DESC`
    )
    .all(...args) as PurchaseListRow[];
}

export function getPurchaseById(id: number): Purchase | undefined {
  return getDb().prepare(`SELECT * FROM purchases WHERE id = ?`).get(id) as Purchase | undefined;
}

export interface PurchaseItemDetail extends PurchaseItem {
  product_name: string;
  product_unit: string | null;
}

export interface PurchaseDetail extends Purchase {
  supplier_name: string;
  supplier_phone: string | null;
  items: PurchaseItemDetail[];
}

export function getPurchaseDetail(id: number): PurchaseDetail | undefined {
  const purchase = getDb()
    .prepare(
      `SELECT p.*, s.name AS supplier_name, s.phone AS supplier_phone
       FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = ?`
    )
    .get(id) as (Purchase & { supplier_name: string; supplier_phone: string | null }) | undefined;
  if (!purchase) return undefined;

  const items = getDb()
    .prepare(
      `SELECT pi.*, pr.name AS product_name, pr.unit AS product_unit
       FROM purchase_items pi JOIN products pr ON pr.id = pi.product_id
       WHERE pi.purchase_id = ?
       ORDER BY pi.id ASC`
    )
    .all(id) as PurchaseItemDetail[];

  return { ...purchase, items };
}

function computeGrandTotal(items: PurchaseItemInput[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * 100) / 100;
}

export function createPurchase(input: PurchaseInput): PurchaseDetail {
  const db = getDb();
  const grandTotal = computeGrandTotal(input.items);

  const purchaseId = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO purchases (supplier_id, purchase_date, reference_no, notes, grand_total)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        input.supplier_id,
        input.purchase_date,
        input.reference_no || null,
        input.notes || null,
        grandTotal
      );
    const newId = Number(result.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, item_total)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const item of input.items) {
      const itemTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      insertItem.run(newId, item.product_id, item.quantity, item.unit_price, itemTotal);
    }
    return newId;
  })();

  return getPurchaseDetail(purchaseId)!;
}

export function updatePurchase(id: number, input: PurchaseInput): PurchaseDetail {
  const db = getDb();
  const grandTotal = computeGrandTotal(input.items);

  db.transaction(() => {
    db.prepare(
      `UPDATE purchases
       SET supplier_id = ?, purchase_date = ?, reference_no = ?, notes = ?, grand_total = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(input.supplier_id, input.purchase_date, input.reference_no || null, input.notes || null, grandTotal, id);

    db.prepare(`DELETE FROM purchase_items WHERE purchase_id = ?`).run(id);

    const insertItem = db.prepare(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, item_total)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const item of input.items) {
      const itemTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
      insertItem.run(id, item.product_id, item.quantity, item.unit_price, itemTotal);
    }
  })();

  return getPurchaseDetail(id)!;
}

export function setPurchaseVoid(id: number, isVoid: boolean): void {
  getDb()
    .prepare(`UPDATE purchases SET is_void = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(isVoid ? 1 : 0, id);
}
