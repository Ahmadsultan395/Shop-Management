import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PurchaseForm } from "../PurchaseForm";
import { getSettings } from "@/lib/db/settings";

export default function NewPurchasePage() {
  const currency = getSettings().currency;
  return (
    <div>
      <Link href="/purchases" className="text-sm text-ledger hover:underline">
        ← Back to Purchases
      </Link>
      <PageHeader title="New Purchase" description="Record a new purchase from a supplier." />
      <PurchaseForm mode="create" currency={currency} />
    </div>
  );
}
