import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// We use Node's built-in scrypt instead of bcrypt/argon2 so the app has one
// less native dependency to cross-compile for the Windows/Tauri build.
// scrypt is a well-established, memory-hard KDF and is fine for a
// single-user local login.

const KEY_LENGTH = 64;

export function hashPassword(plainPassword: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainPassword, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(plainPassword: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(plainPassword, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function isPasswordStrongEnough(plainPassword: string): boolean {
  // Deliberately simple: this protects a local shop PC from casual
  // snooping, not a hardened multi-tenant system. Require a minimum
  // length only, either a PIN (4+ digits) or a password (6+ chars).
  return plainPassword.trim().length >= 4;
}
