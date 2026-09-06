import Link from "next/link";
import { notFound } from "next/navigation";
import { getPurchaseDetail } from "@/lib/db/purchases";
import { getSettings } from "@/lib/db/settings";
import { formatCurrency } from "@/lib/utils";
import { PurchaseActions } from "../PurchaseActions";

export default function PurchaseViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const purchase = getPurchaseDetail(id);
  if (!purchase) notFound();

  const settings = getSettings();
  const currency = settings.currency;
  const generatedAt = new Date().toLocaleString("en-GB");

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/purchases" className="text-sm text-ledger hover:underline">
          ← Back to Purchases
        </Link>
        <PurchaseActions purchaseId={id} isVoid={purchase.is_void === 1} />
      </div>

      {purchase.is_void === 1 && (
        <div className="no-print mb-4 rounded bg-stamp-red/10 px-4 py-2 text-sm text-stamp-red">
          This purchase has been voided and is excluded from totals and reports.
        </div>
      )}

      <div className="panel mx-auto max-w-3xl p-8 print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between border-b border-paper-line pb-6">
          <div>
            <h1 className="font-serif text-2xl">{settings.shop_name}</h1>
            {settings.address && <p className="text-sm text-ink-soft">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-ink-soft">{settings.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-soft">Purchase Record</p>
            <p className="font-serif text-lg">#{purchase.id}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Supplier</p>
            <p className="font-medium">{purchase.supplier_name}</p>
            {purchase.supplier_phone && <p className="text-ink-soft">{purchase.supplier_phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-soft">Date</p>
            <p className="font-medium">{purchase.purchase_date}</p>
            {purchase.reference_no && (
              <p className="mt-1 text-ink-soft">Ref: {purchase.reference_no}</p>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/20 text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 font-medium text-right">Quantity</th>
              <th className="py-2 font-medium text-right">Price</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id} className="border-b border-paper-line">
                <td className="py-2">{item.product_name}</td>
                <td className="py-2 text-right">
                  {item.quantity}
                  {item.product_unit ? ` ${item.product_unit}` : ""}
                </td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price, currency)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.item_total, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-3 text-right font-medium">
                Grand Total
              </td>
              <td className="py-3 text-right font-serif text-lg">
                {formatCurrency(purchase.grand_total, currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        {purchase.notes && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-ink-soft">Notes</p>
            <p className="text-sm text-ink-soft">{purchase.notes}</p>
          </div>
        )}

        <p className="mt-8 text-right text-[11px] text-ink-soft">Generated {generatedAt}</p>
      </div>
    </div>
  );
}
