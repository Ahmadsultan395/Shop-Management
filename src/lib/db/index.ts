import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Resolve where the .db file lives.
//
// - In dev: ./data/shop-manager.db inside the project folder.
// - In the packaged app: Tauri (see src-tauri/src/main.rs) sets
//   SHOP_MANAGER_DATA_DIR to the OS's per-user app-data folder before it
//   spawns this Next.js server as a sidecar process. That folder is always
//   writable by a normal Windows user, unlike the Program Files install
//   directory, which is why we never hardcode a path next to the app.
function resolveDataDir(): string {
  const fromEnv = process.env.SHOP_MANAGER_DATA_DIR;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  return path.join(process.cwd(), "data");
}

function resolveDbPath(): string {
  const dir = resolveDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "shop-manager.db");
}

// A module-level singleton. Next.js may reuse this module across requests
// in the same server process, so we guard against re-opening the file.
declare global {
  // eslint-disable-next-line no-var
  var __shopManagerDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); // safer for a desktop app that may lose power mid-write
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  // In the standalone/packaged build, schema.sql is copied next to the
  // server (see src-tauri packaging notes) — fall back to that location.
  const fallbackSchemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, "utf-8")
    : fs.readFileSync(fallbackSchemaPath, "utf-8");
  db.exec(sql);

  // Ensure a single settings row always exists so the app never has to
  // special-case "no settings yet".
  db.prepare(
    `INSERT OR IGNORE INTO settings (id, shop_name, currency) VALUES (1, 'My Shop', 'PKR')`
  ).run();

  return db;
}

export function getDb(): Database.Database {
  if (!global.__shopManagerDb) {
    global.__shopManagerDb = createConnection();
  }
  return global.__shopManagerDb;
}

export function getDbFilePath(): string {
  return resolveDbPath();
}

export function getDataDir(): string {
  return resolveDataDir();
}

/**
 * Closes the current connection (if open) and clears the singleton so the
 * next getDb() call reopens a fresh connection. Used by Restore, after the
 * underlying .db file on disk has been swapped out — SQLite/Windows can't
 * have the destination file open while it's being replaced.
 */
export function resetDbConnection(): void {
  if (global.__shopManagerDb) {
    global.__shopManagerDb.close();
    global.__shopManagerDb = undefined;
  }
}
