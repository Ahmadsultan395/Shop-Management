import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

// A random signing key for session cookies, generated once per install and
// persisted next to the database. Regenerating it on every server start
// would log everyone out each time the app is reopened, so it must survive
// restarts. It never leaves the user's machine.
function dataDir(): string {
  const fromEnv = process.env.SHOP_MANAGER_DATA_DIR;
  const dir = fromEnv && fromEnv.trim().length > 0 ? fromEnv : path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

declare global {
  // eslint-disable-next-line no-var
  var __shopManagerSessionSecret: string | undefined;
}

export function getSessionSecret(): string {
  if (global.__shopManagerSessionSecret) return global.__shopManagerSessionSecret;

  const secretPath = path.join(dataDir(), "session.key");
  if (fs.existsSync(secretPath)) {
    global.__shopManagerSessionSecret = fs.readFileSync(secretPath, "utf-8").trim();
    return global.__shopManagerSessionSecret;
  }

  const secret = randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  global.__shopManagerSessionSecret = secret;
  return secret;
}
