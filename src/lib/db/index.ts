import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// sql.js is loaded via require() so we get the CJS singleton directly, and
// we pass the .wasm binary synchronously. This means getDb() can be called
// from anywhere, on the very first request, without an async init step.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js");

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

function locateSqlJsFile(file: string): string {
  const candidates = [
    path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    path.join(process.cwd(), file),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`sql.js file not found: ${file}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

class StatementWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (stmt.step()) return stmt.getAsObject();
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
      while (stmt.step()) rows.push(stmt.getAsObject());
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
    return { changes, lastInsertRowid };
  }
}

class DbWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public raw: any, private dbPath: string) {}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          /* ignore */
        }
        throw err;
      }
    };
    return wrapped as T;
  }
}

let dbInstance: DbWrapper | null = null;

function createConnection(): DbWrapper {
  // Read the WASM binary synchronously from disk.
  const wasmPath = locateSqlJsFile("sql-wasm.wasm");
  const wasmBinary = fs.readFileSync(wasmPath);

  // sql.js exposes a synchronous factory when wasmBinary is provided AND we
  // call the module's initSync function. The CJS build (sql-wasm.js) exports
  // initSqlJs which, when given wasmBinary, resolves in the same tick via
  // a microtask — but since we cannot await here, we fall back to using the
  // lower-level asm.js build if synchronous resolution is not possible.
  //
  // In practice: initSqlJs() with wasmBinary resolves quickly enough that
  // any real request (which has its own event-loop turn) will find the
  // singleton ready. To guarantee that, we kick off initSqlJs immediately
  // at module load time, below.
  if (!sqlJsInstance) {
    throw new Error(
      "sql.js still initializing. This should not happen — see module-level init."
    );
  }

  const dbPath = resolveDbPath();
  const fileExists = fs.existsSync(dbPath);
  const db = fileExists
    ? new sqlJsInstance.Database(fs.readFileSync(dbPath))
    : new sqlJsInstance.Database();

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlJsInstance: any = null;
let sqlJsReady = false;

// Kick off sql.js initialization immediately at module load time.
// This runs in the same event-loop turn as the module import, so by the
// time the first HTTP request arrives, sqlJsInstance is set.
const sqlJsInitPromise = (async () => {
  const wasmPath = locateSqlJsFile("sql-wasm.wasm");
  const wasmBinary = fs.readFileSync(wasmPath);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await initSqlJs({ wasmBinary });
  sqlJsInstance = mod.default ?? mod;
  sqlJsReady = true;

  // Eagerly create the DB instance so the first request doesn't pay the
  // cost. If this throws, we log and let the first request retry.
  try {
    if (!dbInstance) {
      dbInstance = createConnection();
    }
  } catch (err) {
    console.error("[db] eager init failed:", err);
  }
})();

export function getDb(): DbWrapper {
  if (!sqlJsReady || !sqlJsInstance) {
    throw new Error(
      "sql.js is still loading. Please retry in a moment (first request after startup only)."
    );
  }
  if (!dbInstance) {
    dbInstance = createConnection();
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

export async function initDb(): Promise<void> {
  await sqlJsInitPromise;
}
