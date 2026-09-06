import { EmployeesClient } from "./EmployeesClient";
import { getSettings } from "@/lib/db/settings";

export default function EmployeesPage() {
  const currency = getSettings().currency;
  return <EmployeesClient currency={currency} />;
}
