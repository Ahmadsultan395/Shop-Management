import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import {
  getSupplierById,
  getSupplierPurchaseSummary,
  getSupplierPurchaseHistory,
} from "@/lib/db/suppliers";
import { getSettings } from "@/lib/db/settings";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import { formatCurrency } from "@/lib/utils";

export default function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const supplier = getSupplierById(id);
  if (!supplier) notFound();

  const currency = getSettings().currency;
  const { from, to } = resolveDateRange(
    (searchParams.range as DateRangePreset) ?? "all",
    searchParams.from,
    searchParams.to
  );

  const summary = getSupplierPurchaseSummary(id, from, to);
  const history = getSupplierPurchaseHistory(id, from, to);

  return (
    <div>
      <Link href="/suppliers" className="text-sm text-ledger hover:underline">
        ← Back to Suppliers
      </Link>

      <PageHeader
        title={supplier.name}
        description={supplier.phone ?? undefined}
        actions={<ActiveBadge active={supplier.is_active === 1} />}
      />

      {supplier.address && <p className="-mt-4 mb-6 text-sm text-ink-soft">{supplier.address}</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Purchase Amount" value={formatCurrency(summary.totalAmount, currency)} />
        <StatCard label="Purchase Count" value={String(summary.purchaseCount)} />
      </div>

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
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/purchases/${h.id}`} className="text-ledger hover:underline">
                        {h.purchase_date}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{h.reference_no || "—"}</td>
                    <td className="px-4 py-2 text-ink-soft">{h.item_count}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatCurrency(h.grand_total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {supplier.notes && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="panel p-4 text-sm text-ink-soft">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}
