import { ReportsClient } from "./ReportsClient";
import { getSettings } from "@/lib/db/settings";

export default function ReportsPage() {
  const settings = getSettings();
  return <ReportsClient shopName={settings.shop_name} currency={settings.currency} />;
}
