import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Data directory / DB path resolution
// ---------------------------------------------------------------------------
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
//
// Return types are `any` on purpose — better-sqlite3 also returns `any`
// from .get() and .all(), which is why the rest of the app assigns the
// results directly to typed interfaces without casts.

class StatementWrapper {
  constructor(private owner: DbWrapper, private sql: string) {}

  private bind(params: unknown[]): unknown[] {
    return params.map((p) => (p === undefined ? null : p));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...params: unknown[]): any {
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.bind(params));
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...params: unknown[]): any[] {
    const stmt = this.owner.raw.prepare(this.sql);
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
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.bind(params));
      stmt.step();
    } finally {
      stmt.free();
    }
    const changes = this.owner.raw.getRowsModified();

    let lastInsertRowid = 0;
    try {
      const res = this.owner.raw.exec("SELECT last_insert_rowid() AS id");
      lastInsertRowid = Number(res[0]?.values[0]?.[0] ?? 0);
    } catch {
      lastInsertRowid = 0;
    }

    // AUTO-PERSIST: every write is flushed to disk immediately.
    this.owner.save();

    return { changes, lastInsertRowid };
  }
}

class DbWrapper {
  constructor(public raw: SqlJsDatabase, private dbPath: string) {}

  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this, sql);
  }

  exec(sql: string): void {
    this.raw.exec(sql);
    this.save();
  }

  pragma(_pragma: string, _options?: unknown): unknown {
    return undefined;
  }

  close(): void {
    this.raw.close();
  }

  save(): void {
    try {
      const data = this.raw.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error("[db] save failed:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
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
        const local = path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
        if (fs.existsSync(local)) return local;
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

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const fallbackSchemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, "utf-8")
    : fs.readFileSync(fallbackSchemaPath, "utf-8");
  db.exec(sql);

  db.run(
    `INSERT OR IGNORE INTO settings (id, shop_name, currency) VALUES (1, 'My Shop', 'PKR')`
  );

  if (!fileExists) wrapper.save();

  return wrapper;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
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

export function resetDbConnection(): void {
  if (global.__shopManagerDb) {
    try {
      global.__shopManagerDb.save();
    } catch {
      /* ignore */
    }
    global.__shopManagerDb.close();
    global.__shopManagerDb = undefined;
  }
}

export function persistDb(): void {
  if (global.__shopManagerDb) {
    global.__shopManagerDb.save();
  }
}
