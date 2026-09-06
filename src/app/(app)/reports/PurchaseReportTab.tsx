"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { DATE_RANGE_OPTIONS, type DateRangePreset } from "@/lib/dateRange";
import { exportReportToPdf, exportReportToXlsx, exportReportToCsv } from "@/lib/reportExport";
import type { Supplier, Product } from "@/types";
import type { PurchaseReportRow, PurchaseReportTotals } from "@/lib/db/reports";

export function PurchaseReportTab({ shopName, currency }: { shopName: string; currency: string }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<PurchaseReportRow[]>([]);
  const [totals, setTotals] = useState<PurchaseReportTotals>({ totalQuantity: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [resolvedRange, setResolvedRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

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
      const params = new URLSearchParams({ range });
      if (range === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      if (supplierId) params.set("supplierId", supplierId);
      if (productId) params.set("productId", productId);

      const res = await fetch(`/api/reports/purchases?${params.toString()}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotals(data.totals ?? { totalQuantity: 0, totalAmount: 0 });
      setResolvedRange({ from: data.from, to: data.to });
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo, supplierId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const dateRangeLabel = resolvedRange.from && resolvedRange.to
    ? `${resolvedRange.from} to ${resolvedRange.to}`
    : "All time";

  const filterParts: string[] = [];
  const supplierName = suppliers.find((s) => String(s.id) === supplierId)?.name;
  const productName = products.find((p) => String(p.id) === productId)?.name;
  if (supplierName) filterParts.push(`Supplier: ${supplierName}`);
  if (productName) filterParts.push(`Product: ${productName}`);
  const filtersSummary = filterParts.join(" · ");

  const columns = ["Date", "Supplier", "Product", "Quantity", "Purchase Price", "Total"];
  const exportRows = rows.map((r) => [
    r.purchase_date,
    r.supplier_name,
    r.product_name,
    r.quantity,
    r.unit_price,
    r.item_total,
  ]);
  const totalsRow = ["", "", "Totals", totals.totalQuantity, "", totals.totalAmount];

  const meta = {
    shopName,
    reportTitle: "Purchase Report",
    filtersSummary,
    dateRangeLabel,
  };

  return (
    <div>
      <div className="panel no-print mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition ${
                range === opt.value
                  ? "border-ledger bg-ledger text-white"
                  : "border-paper-line bg-white text-ink-soft hover:bg-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {range === "custom" && (
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SelectField label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToPdf(meta, columns, exportRows, totalsRow, "purchase-report.pdf")}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToXlsx(meta, columns, exportRows, totalsRow, "purchase-report.xlsx")}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportReportToCsv(meta, columns, exportRows, totalsRow, "purchase-report.csv")}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="print-header mb-4 hidden print:block">
        <h1 className="font-serif text-xl">{shopName}</h1>
        <p className="text-sm">Purchase Report</p>
        <p className="text-xs text-ink-soft">{dateRangeLabel}</p>
        {filtersSummary && <p className="text-xs text-ink-soft">{filtersSummary}</p>}
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading report..." />
        ) : rows.length === 0 ? (
          <EmptyState message="No purchases match these filters." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium text-right">Purchase Price</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-paper-line last:border-0">
                  <td className="px-4 py-2">{r.purchase_date}</td>
                  <td className="px-4 py-2">{r.supplier_name}</td>
                  <td className="px-4 py-2">{r.product_name}</td>
                  <td className="px-4 py-2 text-right">{r.quantity}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.unit_price, currency)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(r.item_total, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium">
                  Totals
                </td>
                <td className="px-4 py-3 text-right font-medium">{totals.totalQuantity}</td>
                <td></td>
                <td className="px-4 py-3 text-right font-serif text-base">
                  {formatCurrency(totals.totalAmount, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
