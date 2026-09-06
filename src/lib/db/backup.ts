import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDb, getDbFilePath, getDataDir, resetDbConnection } from "./index";

const SQLITE_HEADER = "SQLite format 3\0";
// Tables that must exist for a file to be accepted as a genuine Shop Manager backup.
const REQUIRED_TABLES = ["users", "suppliers", "products", "purchases", "purchase_items", "employees", "salary_records", "settings"];

function todayCompact(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatBackupFilename(): string {
  return `shop-backup-${todayCompact()}.db`;
}

function tmpDir(): string {
  const dir = path.join(getDataDir(), "tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safetyBackupDir(): string {
  const dir = path.join(getDataDir(), "pre-restore-backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Creates a full, consistent snapshot of the live database using SQLite's
 * native backup API (safe even while the app is running under WAL mode),
 * and returns the temp file path for the API route to stream to the user.
 * Caller is responsible for deleting the returned path once sent.
 */
export async function createBackupSnapshot(): Promise<string> {
  const db = getDb();
  const dest = path.join(tmpDir(), `backup-${Date.now()}.db`);
  await db.backup(dest);
  return dest;
}

/** Checks the file header and required tables — rejects anything that isn't a genuine Shop Manager database. */
export function validateBackupFile(filePath: string): { ok: boolean; message?: string } {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const headerBuf = Buffer.alloc(16);
    fs.readSync(fd, headerBuf, 0, 16, 0);
    if (headerBuf.toString("utf-8") !== SQLITE_HEADER) {
      return { ok: false, message: "This file is not a valid SQLite database." };
    }
  } catch {
    return { ok: false, message: "Could not read the selected file." };
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }

  let testDb: Database.Database | null = null;
  try {
    testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = testDb.pragma("integrity_check", { simple: true }) as string;
    if (integrity !== "ok") {
      return { ok: false, message: "This backup file appears to be corrupted." };
    }
    const tables = new Set(
      (testDb.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[]).map(
        (t) => t.name
      )
    );
    const missing = REQUIRED_TABLES.filter((t) => !tables.has(t));
    if (missing.length > 0) {
      return { ok: false, message: "This file doesn't look like a Shop Manager backup." };
    }
  } catch {
    return { ok: false, message: "Could not open this file as a database." };
  } finally {
    testDb?.close();
  }

  return { ok: true };
}

export interface RestoreResult {
  ok: boolean;
  message?: string;
  safetyBackupPath?: string;
}

/**
 * Restores the live database from an already-validated file path.
 * Always takes a fresh safety snapshot of the current data first, so a
 * bad restore can be undone by copying that file back manually.
 */
export async function restoreFromFile(uploadedPath: string): Promise<RestoreResult> {
  const validation = validateBackupFile(uploadedPath);
  if (!validation.ok) return { ok: false, message: validation.message };

  const liveDbPath = getDbFilePath();

  // Snapshot current data before touching anything, in case the restore
  // turns out to be a mistake.
  const safetyPath = path.join(safetyBackupDir(), `pre-restore-${Date.now()}.db`);
  try {
    await getDb().backup(safetyPath);
  } catch {
    return { ok: false, message: "Could not create a safety backup — restore was cancelled to protect your data." };
  }

  try {
    resetDbConnection(); // release the file handle before replacing it (required on Windows)

    // Remove WAL/SHM sidecar files from the old database so no stale
    // uncommitted pages get attached to the restored file.
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = liveDbPath + suffix;
      if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
    }

    fs.copyFileSync(uploadedPath, liveDbPath);
    return { ok: true, safetyBackupPath: safetyPath };
  } catch {
    return { ok: false, message: "Restore failed while replacing the database file." };
  }
}
