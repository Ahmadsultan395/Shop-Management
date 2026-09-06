"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { formatCurrency, todayIso } from "@/lib/utils";
import type { Supplier, Product } from "@/types";

interface ItemRow {
  key: string;
  product_id: string;
  quantity: string;
  unit_price: string;
}

function emptyRow(): ItemRow {
  return { key: Math.random().toString(36).slice(2), product_id: "", quantity: "", unit_price: "" };
}

export interface PurchaseFormInitialData {
  supplier_id: number;
  purchase_date: string;
  reference_no: string | null;
  notes: string | null;
  items: { product_id: number; quantity: number; unit_price: number }[];
}

export function PurchaseForm({
  mode,
  purchaseId,
  initialData,
  currency,
}: {
  mode: "create" | "edit";
  purchaseId?: number;
  initialData?: PurchaseFormInitialData;
  currency: string;
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [supplierId, setSupplierId] = useState(initialData ? String(initialData.supplier_id) : "");
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchase_date ?? todayIso());
  const [referenceNo, setReferenceNo] = useState(initialData?.reference_no ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    initialData && initialData.items.length > 0
      ? initialData.items.map((i) => ({
          key: Math.random().toString(36).slice(2),
          product_id: String(i.product_id),
          quantity: String(i.quantity),
          unit_price: String(i.unit_price),
        }))
      : [emptyRow()]
  );

  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [supRes, prodRes] = await Promise.all([
          fetch("/api/suppliers?status=all"),
          fetch("/api/products?status=all"),
        ]);
        const supData = await supRes.json();
        const prodData = await prodRes.json();
        setSuppliers(supData.suppliers ?? []);
        setProducts(prodData.products ?? []);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  const grandTotal = useMemo(() => {
    return items.reduce((sum, row) => {
      const qty = parseFloat(row.quantity);
      const price = parseFloat(row.unit_price);
      if (Number.isFinite(qty) && Number.isFinite(price)) return sum + qty * price;
      return sum;
    }, 0);
  }, [items]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});

    const payload = {
      supplier_id: supplierId ? Number(supplierId) : undefined,
      purchase_date: purchaseDate,
      reference_no: referenceNo,
      notes,
      items: items.map((row) => ({
        product_id: row.product_id ? Number(row.product_id) : undefined,
        quantity: row.quantity ? parseFloat(row.quantity) : undefined,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : undefined,
      })),
    };

    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/purchases/${purchaseId}` : "/api/purchases";
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save purchase.");
        setFields(data.fields ?? {});
        return;
      }
      router.push(`/purchases/${data.purchase.id}`);
    } catch {
      setError("Could not reach the local server.");
    } finally {
      setSaving(false);
    }
  }

  function productUnit(productId: string): string {
    const p = products.find((prod) => String(prod.id) === productId);
    return p?.unit ? ` ${p.unit}` : "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <SelectField
          label="Supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          error={fields.supplier_id}
          disabled={loadingOptions}
          required
        >
          <option value="">Select supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.is_active === 0 ? " (Inactive)" : ""}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Purchase Date"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          error={fields.purchase_date}
          required
        />

        <TextField
          label="Reference / Invoice Number (optional)"
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />

        <div className="md:col-span-3">
          <TextareaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
          <h2 className="text-sm font-medium">Items</h2>
          <Button type="button" variant="secondary" onClick={addRow} className="text-xs">
            + Add Item
          </Button>
        </div>

        {fields.items && <p className="px-4 pt-3 text-xs text-stamp-red">{fields.items}</p>}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Quantity</th>
              <th className="px-4 py-2 font-medium">Purchase Price</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const qty = parseFloat(row.quantity);
              const price = parseFloat(row.unit_price);
              const total = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
              return (
                <tr key={row.key} className="border-b border-paper-line last:border-0">
                  <td className="px-4 py-2">
                    <select
                      className="field-input"
                      value={row.product_id}
                      onChange={(e) => updateItem(row.key, { product_id: e.target.value })}
                      disabled={loadingOptions}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.is_active === 0 ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="field-input"
                      value={row.quantity}
                      onChange={(e) => updateItem(row.key, { quantity: e.target.value })}
                      placeholder={`0${productUnit(row.product_id)}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="field-input"
                      value={row.unit_price}
                      onChange={(e) => updateItem(row.key, { unit_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(total, currency)}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-ink-soft hover:text-stamp-red"
                      aria-label="Remove item"
                      disabled={items.length <= 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium">
                Grand Total
              </td>
              <td className="px-4 py-3 text-right font-serif text-lg">
                {formatCurrency(grandTotal, currency)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {mode === "edit" ? "Save Changes" : "Save Purchase"}
        </Button>
      </div>
    </form>
  );
}
