import { NextRequest } from "next/server";
import { getUserById, updateUserPassword } from "@/lib/db/users";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/auth/password";
import { getCurrentSession } from "@/lib/auth/session";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = getCurrentSession();
  if (!session) return jsonError("Please log in again.", 401);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(currentPassword)) fields.currentPassword = "Enter your current password.";
  if (!isNonEmptyString(newPassword)) {
    fields.newPassword = "Enter a new password or PIN.";
  } else if (!isPasswordStrongEnough(newPassword)) {
    fields.newPassword = "Use at least 4 characters (e.g. a 4-digit PIN or a short password).";
  }
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const user = getUserById(session.userId);
  if (!user) return jsonError("Account not found.", 404);

  const valid = verifyPassword(currentPassword!, user.password_hash, user.password_salt);
  if (!valid) {
    return jsonError("Current password is incorrect.", 400, {
      currentPassword: "Current password is incorrect.",
    });
  }

  const { hash, salt } = hashPassword(newPassword!);
  updateUserPassword(user.id, hash, salt);

  return jsonOk({ ok: true });
}
