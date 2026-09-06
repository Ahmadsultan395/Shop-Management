import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import {
  getProductById,
  getProductPurchaseSummary,
  getProductPurchaseHistory,
  getProductSuppliers,
} from "@/lib/db/products";
import { getSettings } from "@/lib/db/settings";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import { formatCurrency } from "@/lib/utils";

export default function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const product = getProductById(id);
  if (!product) notFound();

  const currency = getSettings().currency;
  const { from, to } = resolveDateRange(
    (searchParams.range as DateRangePreset) ?? "all",
    searchParams.from,
    searchParams.to
  );

  const summary = getProductPurchaseSummary(id, from, to);
  const history = getProductPurchaseHistory(id, from, to);
  const suppliers = getProductSuppliers(id);

  return (
    <div>
      <Link href="/products" className="text-sm text-ledger hover:underline">
        ← Back to Products
      </Link>

      <PageHeader
        title={product.name}
        description={[product.category, product.unit].filter(Boolean).join(" · ") || undefined}
        actions={<ActiveBadge active={product.is_active === 1} />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Quantity Purchased" value={String(summary.totalQuantity)} />
        <StatCard label="Total Amount Spent" value={formatCurrency(summary.totalAmount, currency)} />
      </div>

      {suppliers.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Purchased From</h2>
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                className="rounded-sm border border-paper-line bg-white px-3 py-1 text-xs text-ledger hover:bg-paper"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Purchase History</h2>
        <DateRangeFilter />

        <div className="panel overflow-hidden">
          {history.length === 0 ? (
            <EmptyState message="No purchases in this date range." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/purchases/${h.id}`} className="text-ledger hover:underline">
                        {h.purchase_date}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{h.supplier_name}</td>
                    <td className="px-4 py-2 text-right">{h.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(h.unit_price, currency)}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(h.item_total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {product.notes && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="panel p-4 text-sm text-ink-soft">{product.notes}</p>
        </div>
      )}
    </div>
  );
}
