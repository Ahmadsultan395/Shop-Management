import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { hasAnyUser, createUser } from "@/lib/db/users";
import { hashPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Setup can only ever run once. If an admin account already exists,
  // this route must refuse — otherwise anyone could reset the login by
  // hitting this endpoint directly.
  if (hasAnyUser()) {
    return jsonError("Setup has already been completed. Please log in instead.", 409);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");

  const { username, password } = body as { username?: string; password?: string };

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(username)) fields.username = "Username is required.";
  if (!isNonEmptyString(password)) fields.password = "Password or PIN is required.";
  else if (!isPasswordStrongEnough(password)) {
    fields.password = "Use at least 4 characters (e.g. a 4-digit PIN or a short password).";
  }
  if (Object.keys(fields).length > 0) {
    return jsonError("Please fix the highlighted fields.", 400, fields);
  }

  const { hash, salt } = hashPassword(password!);
  const user = createUser(username!.trim(), hash, salt);

  const token = createSessionToken(user.id, user.username);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return jsonOk({ ok: true, username: user.username });
}
