import { getDb, getDbFilePath } from "./index";

const db = getDb();
const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
  .all() as { name: string }[];

console.log(`Database ready at: ${getDbFilePath()}`);
console.log("Tables:", tables.map((t) => t.name).join(", "));
