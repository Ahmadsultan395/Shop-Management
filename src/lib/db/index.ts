import initSqlJs from "sql.js";
import type { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

class StatementWrapper {
  constructor(private owner: DbWrapper, private sql: string) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bindAll(params: any[]): any[] {
    return params.map((p) => (p === undefined ? null : p));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...params: any[]): Row {
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.bindAll(params));
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...params: any[]): Row[] {
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.bindAll(params));
      const rows: Row[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.bindAll(params));
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

    // Do NOT save here — let the transaction() wrapper or the caller decide.
    // (If we saved on every run(), an in-progress transaction would be
    // written to disk with uncommitted state if the process crashed.)

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

  /**
   * better-sqlite3-style transaction wrapper.
   *
   * Usage (identical to better-sqlite3):
   *   const fn = db.transaction(() => { ...writes... });
   *   const result = fn();
   *
   * sql.js has no built-in transaction helper, so we issue BEGIN/COMMIT
   * manually. On error we ROLLBACK and re-throw. The database is persisted
   * to disk only after a successful COMMIT.
   */
  transaction<T extends (...args: any[]) => any>(fn: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (...args: any[]): any => {
      this.raw.exec("BEGIN");
      try {
        const result = fn(...args);
        this.raw.exec("COMMIT");
        this.save();
        return result;
      } catch (err) {
        try {
          this.raw.exec("ROLLBACK");
        } catch {
          /* ignore rollback failure */
        }
        throw err;
      }
    };
    return wrapped as T;
  }
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let dbInstance: DbWrapper | null = null;
let sqlJsPromise: Promise<SqlJsStatic> | null = null;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => {
        const local = path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
        if (fs.existsSync(local)) return local;
        return path.join(process.cwd(), file);
      },
    });
  }
  return sqlJsPromise;
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
  if (!dbInstance) {
    dbInstance = await createConnection();
  }
}

export function getDb(): DbWrapper {
  if (!dbInstance) {
    throw new Error(
      "Database not initialized. Call initDb() once at app startup (src/instrumentation.ts)."
    );
  }
  return dbInstance;
}

export function getDbFilePath(): string {
  return resolveDbPath();
}

export function getDataDir(): string {
  return resolveDataDir();
}

export function resetDbConnection(): void {
  if (dbInstance) {
    try {
      dbInstance.save();
    } catch {
      /* ignore */
    }
    dbInstance.close();
    dbInstance = null;
  }
}

export function persistDb(): void {
  if (dbInstance) {
    dbInstance.save();
  }
}
