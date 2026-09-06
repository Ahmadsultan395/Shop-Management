export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/db/users";
import { SetupForm } from "./SetupForm";

export default function SetupPage() {
  // Setup is a one-time step. Once an account exists, this route should
  // never be reachable again — send people to the normal login screen.
  if (hasAnyUser()) redirect("/login");
  return <SetupForm />;
}
