import { getSupplierById } from "@/lib/db/suppliers";
import { getProductById } from "@/lib/db/products";
import { isValidIsoDate, isPositiveNumber, isNonNegativeNumber } from "@/lib/utils";
import type { PurchaseInput } from "@/lib/db/purchases";

export interface RawPurchaseItem {
  product_id?: number;
  quantity?: number;
  unit_price?: number;
}

export interface RawPurchaseInput {
  supplier_id?: number;
  purchase_date?: string;
  reference_no?: string;
  notes?: string;
  items?: RawPurchaseItem[];
}

export interface ValidationResult {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  value?: PurchaseInput;
}

export function validatePurchaseInput(raw: RawPurchaseInput): ValidationResult {
  const fields: Record<string, string> = {};

  if (!raw.supplier_id || !Number.isInteger(raw.supplier_id)) {
    fields.supplier_id = "Select a supplier.";
  } else if (!getSupplierById(raw.supplier_id)) {
    fields.supplier_id = "Selected supplier does not exist.";
  }

  if (!isValidIsoDate(raw.purchase_date)) {
    fields.purchase_date = "Enter a valid purchase date.";
  }

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    fields.items = "Add at least one item to the purchase.";
  } else {
    for (let i = 0; i < raw.items.length; i++) {
      const item = raw.items[i];
      if (!item.product_id || !Number.isInteger(item.product_id)) {
        fields.items = `Item ${i + 1}: select a product.`;
        break;
      }
      if (!getProductById(item.product_id)) {
        fields.items = `Item ${i + 1}: selected product does not exist.`;
        break;
      }
      if (!isPositiveNumber(item.quantity)) {
        fields.items = `Item ${i + 1}: quantity must be greater than 0.`;
        break;
      }
      if (!isNonNegativeNumber(item.unit_price)) {
        fields.items = `Item ${i + 1}: price cannot be negative.`;
        break;
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Please fix the highlighted fields.", fields };
  }

  return {
    ok: true,
    value: {
      supplier_id: raw.supplier_id!,
      purchase_date: raw.purchase_date!,
      reference_no: raw.reference_no || null,
      notes: raw.notes || null,
      items: raw.items!.map((i) => ({
        product_id: i.product_id!,
        quantity: i.quantity!,
        unit_price: i.unit_price!,
      })),
    },
  };
}
