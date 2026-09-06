"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { resolveDateRange, DATE_RANGE_OPTIONS, type DateRangePreset } from "@/lib/dateRange";
import type { Supplier, Product } from "@/types";
import type { PurchaseListRow } from "@/lib/db/purchases";

type StatusFilter = "active" | "void" | "all";

export function PurchasesClient({ currency }: { currency: string }) {
  const [purchases, setPurchases] = useState<PurchaseListRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    async function loadOptions() {
      const [supRes, prodRes] = await Promise.all([
        fetch("/api/suppliers?status=all"),
        fetch("/api/products?status=all"),
      ]);
      setSuppliers((await supRes.json()).suppliers ?? []);
      setProducts((await prodRes.json()).products ?? []);
    }
    loadOptions();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = resolveDateRange(rangePreset, customFrom, customTo);
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set("search", search.trim());
      if (supplierId) params.set("supplierId", supplierId);
      if (productId) params.set("productId", productId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const data = await res.json();
      setPurchases(data.purchases ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, supplierId, productId, status, rangePreset, customFrom, customTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const total = purchases.reduce((sum, p) => sum + p.grand_total, 0);

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="What you bought, from whom, and how much."
        actions={
          <Link href="/purchases/new">
            <Button>New Purchase</Button>
          </Link>
        }
      />

      <div className="panel mb-4 space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <TextField
            label=""
            placeholder="Search supplier or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SelectField label="" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <div className="flex gap-1">
            {(["active", "void", "all"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-medium capitalize transition ${
                  status === s
                    ? "border-ledger bg-ledger text-white"
                    : "border-paper-line bg-white text-ink-soft hover:bg-paper"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRangePreset(opt.value)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                rangePreset === opt.value
                  ? "border-ledger bg-ledger text-white"
                  : "border-paper-line bg-white text-ink-soft hover:bg-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {rangePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="field-input w-auto py-1.5 text-xs"
              />
              <span className="text-xs text-ink-soft">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="field-input w-auto py-1.5 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading purchases..." />
        ) : purchases.length === 0 ? (
          <EmptyState message="No purchases found for these filters." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-paper-line last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3">
                    <Link href={`/purchases/${p.id}`} className="text-ledger hover:underline">
                      {p.purchase_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.reference_no || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.item_count}</td>
                  <td className="px-4 py-3">
                    {p.is_void ? (
                      <span className="badge bg-stamp-red/10 text-stamp-red">Void</span>
                    ) : (
                      <span className="badge bg-stamp-green/10 text-stamp-green">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(p.grand_total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-medium">
                  Total ({purchases.length} purchase{purchases.length === 1 ? "" : "s"})
                </td>
                <td className="px-4 py-3 text-right font-serif text-base">
                  {formatCurrency(total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
