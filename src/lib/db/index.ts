import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Data directory / DB path resolution
// ---------------------------------------------------------------------------
// - In dev: ./data/shop-manager.db inside the project folder.
// - In the packaged app: Electron (see electron/main.js) sets
//   SHOP_MANAGER_DATA_DIR to the OS's per-user app-data folder before it
//   spawns this Next.js server. That folder is always writable by a normal
//   user, unlike the Program Files install directory.
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

// ---------------------------------------------------------------------------
// better-sqlite3-compatible wrapper around sql.js
// ---------------------------------------------------------------------------
// The rest of the app (dashboard.ts, users.ts, suppliers.ts, ...) calls
// db.prepare(sql).get(...) / .all(...) / .run(...) expecting the
// better-sqlite3 API. sql.js has a different API, so we wrap it here to
// keep every other file unchanged.
class StatementWrapper {
  constructor(private db: SqlJsDatabase, private sql: string) {}

  private bind(params: unknown[]): unknown[] {
    return params.map((p) => (p === undefined ? null : p));
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const stmt = this.db.prepare(this.sql);
    try {
      stmt.bind(this.bind(params));
      if (stmt.step()) {
        return stmt.getAsObject() as Record<string, unknown>;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.db.prepare(this.sql);
    try {
      stmt.bind(this.bind(params));
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(this.sql);
    try {
      stmt.bind(this.bind(params));
      stmt.step();
    } finally {
      stmt.free();
    }
    const changes = this.db.getRowsModified();

    // sql.js doesn't expose lastInsertRowid via the statement, so query it.
    let lastInsertRowid = 0;
    try {
      const res = this.db.exec("SELECT last_insert_rowid() AS id");
      lastInsertRowid = Number(res[0]?.values[0]?.[0] ?? 0);
    } catch {
      lastInsertRowid = 0;
    }

    return { changes, lastInsertRowid };
  }
}

class DbWrapper {
  constructor(public raw: SqlJsDatabase, private dbPath: string) {}

  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this.raw, sql);
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  // better-sqlite3's pragma() is a no-op here — sql.js runs in-memory and
  // doesn't support WAL. Callers can keep calling it safely.
  pragma(_pragma: string, _options?: unknown): unknown {
    return undefined;
  }

  close(): void {
    this.raw.close();
  }

  // Persist the in-memory database to disk. Called after writes and on a
  // 30-second interval (see bottom of file).
  save(): void {
    const data = this.raw.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton (guarded on globalThis so Next.js dev hot-reload
// doesn't open multiple connections)
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __shopManagerDb: DbWrapper | undefined;
  // eslint-disable-next-line no-var
  var __sqlJsModule: Promise<typeof import("sql.js").default> | undefined;
}

async function loadSqlJs() {
  if (!global.__sqlJsModule) {
    global.__sqlJsModule = initSqlJs({
      locateFile: (file: string) => {
        // In dev: node_modules/sql.js/dist/<file>
        const local = path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
        if (fs.existsSync(local)) return local;
        // In packaged app: file sits next to server.js (see prepare-standalone.js)
        return path.join(process.cwd(), file);
      },
    });
  }
  return global.__sqlJsModule;
}

async function createConnection(): Promise<DbWrapper> {
  const dbPath = resolveDbPath();
  const SQL = await loadSqlJs();

  const fileExists = fs.existsSync(dbPath);
  const db = fileExists
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  const wrapper = new DbWrapper(db, dbPath);

  // Apply schema. schema.sql MUST use CREATE TABLE IF NOT EXISTS so this is
  // safe to run on every startup.
  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const fallbackSchemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, "utf-8")
    : fs.readFileSync(fallbackSchemaPath, "utf-8");
  db.exec(sql);

  // Ensure the singleton settings row exists.
  db.run(
    `INSERT OR IGNORE INTO settings (id, shop_name, currency) VALUES (1, 'My Shop', 'PKR')`
  );

  // First run: create the file on disk so it isn't lost if the app is killed
  // before the first auto-save tick.
  if (!fileExists) wrapper.save();

  return wrapper;
}

// ---------------------------------------------------------------------------
// Public API — same names as before, so nothing else in the app needs to change
// ---------------------------------------------------------------------------

/**
 * Must be called once at app startup (see src/instrumentation.ts). After
 * this resolves, getDb() can be called synchronously anywhere.
 */
export async function initDb(): Promise<void> {
  if (!global.__shopManagerDb) {
    global.__shopManagerDb = await createConnection();
  }
}

export function getDb(): DbWrapper {
  if (!global.__shopManagerDb) {
    throw new Error(
      "Database not initialized. Call initDb() once at app startup (src/instrumentation.ts)."
    );
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
 * Closes the current connection (saving first) and clears the singleton so
 * the next initDb() reopens a fresh connection. Used by Restore after the
 * .db file on disk has been swapped out.
 */
export function resetDbConnection(): void {
  if (global.__shopManagerDb) {
    try {
      global.__shopManagerDb.save();
    } catch {
      /* ignore — file may be replaced right after */
    }
    global.__shopManagerDb.close();
    global.__shopManagerDb = undefined;
  }
}

/**
 * Persist the in-memory database to disk immediately. Call this after any
 * write that the user would be upset to lose (e.g. saving a purchase).
 */
export function persistDb(): void {
  if (global.__shopManagerDb) {
    global.__shopManagerDb.save();
  }
}

// Auto-save every 30 seconds as a safety net for writes that don't call
// persistDb() explicitly.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    if (global.__shopManagerDb) {
      try {
        global.__shopManagerDb.save();
      } catch {
        /* ignore */
      }
    }
  }, 30_000);
  // Don't keep the Node process alive just for this timer.
  if (typeof timer === "object" && typeof (timer as { unref?: () => void }).unref === "function") {
    (timer as { unref: () => void }).unref();
  }
}
