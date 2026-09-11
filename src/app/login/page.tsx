export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/db/users";
import { getCurrentSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  if (!hasAnyUser()) redirect("/setup");
  if (getCurrentSession()) redirect("/dashboard");

  const settings = getSettings();
  return <LoginForm shopName={settings.shop_name} />;
}
