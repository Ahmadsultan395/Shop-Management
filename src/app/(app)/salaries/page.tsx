import { SalariesClient } from "./SalariesClient";
import { getSettings } from "@/lib/db/settings";

export default function SalariesPage() {
  const currency = getSettings().currency;
  return <SalariesClient currency={currency} />;
}
