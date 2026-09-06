import { PurchasesClient } from "./PurchasesClient";
import { getSettings } from "@/lib/db/settings";

export default function PurchasesPage() {
  const currency = getSettings().currency;
  return <PurchasesClient currency={currency} />;
}
