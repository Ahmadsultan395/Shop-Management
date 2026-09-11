export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/db/users";
import { getCurrentSession } from "@/lib/auth/session";

export default function RootPage() {
  if (!hasAnyUser()) redirect("/setup");
  if (!getCurrentSession()) redirect("/login");
  redirect("/dashboard");
}
