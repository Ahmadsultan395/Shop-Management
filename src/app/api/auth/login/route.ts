import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getUserByUsername, hasAnyUser } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!hasAnyUser()) {
    return jsonError("No account exists yet. Please complete setup first.", 409);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const { username, password } = body as { username?: string; password?: string };

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return jsonError("Enter your username and password/PIN.");
  }

  const user = getUserByUsername(username.trim());
  // Deliberately the same generic message for "unknown user" and "wrong
  // password" so the login screen doesn't reveal which part was wrong.
  const invalidMsg = "Incorrect username or password.";
  if (!user) return jsonError(invalidMsg, 401);

  const valid = verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) return jsonError(invalidMsg, 401);

  const token = createSessionToken(user.id, user.username);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return jsonOk({ ok: true, username: user.username });
}
