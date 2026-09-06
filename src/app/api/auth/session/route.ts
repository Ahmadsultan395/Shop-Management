import { hasAnyUser } from "@/lib/db/users";
import { getCurrentSession } from "@/lib/auth/session";
import { jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const setupComplete = hasAnyUser();
  const session = getCurrentSession();
  return jsonOk({
    setupComplete,
    loggedIn: Boolean(session),
    username: session?.username ?? null,
  });
}
