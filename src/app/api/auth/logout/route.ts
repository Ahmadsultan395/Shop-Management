import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST() {
  cookies().delete(SESSION_COOKIE);
  return jsonOk({ ok: true });
}
