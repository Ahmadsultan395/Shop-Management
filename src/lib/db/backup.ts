import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import {
  getDb,
  getDbFilePath,
  getDataDir,
  resetDbConnection,
  initDb,
} from "./index";

const SQLITE_HEADER = "SQLite format 3\0";
// Tables that must exist for a file to be accepted as a genuine Shop Manager backup.
const REQUIRED_TABLES = [
  "users",
  "suppliers",
  "products",
  "purchases",
  "purchase_items",
  "employees",
  "salary_records",
  "settings",
];

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
 * Creates a full, consistent snapshot of the live in-memory database and
 * writes it to a temp file, returning that path for the API route to stream
 * to the user. Caller is responsible for deleting the returned path once sent.
 */
export async function createBackupSnapshot(): Promise<string> {
  const db = getDb();
  const dest = path.join(tmpDir(), `backup-${Date.now()}.db`);
  const data = db.raw.export();
  fs.writeFileSync(dest, Buffer.from(data));
  return dest;
}

/** Checks the file header and required tables — rejects anything that isn't a genuine Shop Manager database. */
export async function validateBackupFile(
  filePath: string
): Promise<{ ok: boolean; message?: string }> {
  // 1. Header check
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

  // 2. Open it with sql.js and check tables
  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        const local = path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
        if (fs.existsSync(local)) return local;
        return path.join(process.cwd(), file);
      },
    });
    const testDb = new SQL.Database(fs.readFileSync(filePath));
    try {
      // integrity check
      const integrity = testDb.exec("PRAGMA integrity_check");
      const integrityValue = integrity[0]?.values[0]?.[0];
      if (integrityValue !== "ok") {
        return { ok: false, message: "This backup file appears to be corrupted." };
      }

      const tableRes = testDb.exec(
        `SELECT name FROM sqlite_master WHERE type = 'table'`
      );
      const tables = new Set<string>(
        (tableRes[0]?.values ?? []).map((row) => String(row[0]))
      );
      const missing = REQUIRED_TABLES.filter((t) => !tables.has(t));
      if (missing.length > 0) {
        return { ok: false, message: "This file doesn't look like a Shop Manager backup." };
      }
    } finally {
      testDb.close();
    }
  } catch {
    return { ok: false, message: "Could not open this file as a database." };
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
  const validation = await validateBackupFile(uploadedPath);
  if (!validation.ok) return { ok: false, message: validation.message };

  const liveDbPath = getDbFilePath();

  // Snapshot current data before touching anything, in case the restore
  // turns out to be a mistake.
  const safetyPath = path.join(safetyBackupDir(), `pre-restore-${Date.now()}.db`);
  try {
    const data = getDb().raw.export();
    fs.writeFileSync(safetyPath, Buffer.from(data));
  } catch {
    return {
      ok: false,
      message:
        "Could not create a safety backup — restore was cancelled to protect your data.",
    };
  }

  try {
    // Save current state, close the in-memory DB, replace the file, reopen.
    resetDbConnection();
    fs.copyFileSync(uploadedPath, liveDbPath);
    await initDb();
    return { ok: true, safetyBackupPath: safetyPath };
  } catch {
    return { ok: false, message: "Restore failed while replacing the database file." };
  }
}
