import { getDb } from "./index";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

/** The app supports exactly one local administrator account by design (see spec §1). */
export function hasAnyUser(): boolean {
  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM users`).get() as { count: number };
  return row.count > 0;
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function createUser(username: string, hash: string, salt: string): UserRow {
  const result = getDb()
    .prepare(
      `INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)`
    )
    .run(username, hash, salt);
  return getUserById(Number(result.lastInsertRowid))!;
}

export function updateUserPassword(id: number, hash: string, salt: string): void {
  getDb()
    .prepare(
      `UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(hash, salt, id);
}

export function updateUsername(id: number, username: string): void {
  getDb()
    .prepare(`UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(username, id);
}
