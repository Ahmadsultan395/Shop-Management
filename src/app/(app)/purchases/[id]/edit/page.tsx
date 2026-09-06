import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PurchaseForm } from "../../PurchaseForm";
import { getPurchaseDetail } from "@/lib/db/purchases";
import { getSettings } from "@/lib/db/settings";

export default function EditPurchasePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const purchase = getPurchaseDetail(id);
  if (!purchase) notFound();

  const currency = getSettings().currency;

  return (
    <div>
      <Link href={`/purchases/${id}`} className="text-sm text-ledger hover:underline">
        ← Back to Purchase
      </Link>
      <PageHeader title="Edit Purchase" description={`${purchase.supplier_name} · ${purchase.purchase_date}`} />
      {purchase.is_void ? (
        <p className="panel p-4 text-sm text-stamp-red">
          This purchase is voided and cannot be edited. Restore it first from the purchase view page.
        </p>
      ) : (
        <PurchaseForm
          mode="edit"
          purchaseId={id}
          currency={currency}
          initialData={{
            supplier_id: purchase.supplier_id,
            purchase_date: purchase.purchase_date,
            reference_no: purchase.reference_no,
            notes: purchase.notes,
            items: purchase.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
          }}
        />
      )}
    </div>
  );
}
