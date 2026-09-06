// Runs automatically after `next build` (see package.json "postbuild").
//
// `next build` with output:"standalone" produces `.next/standalone/server.js`
// plus a trimmed `node_modules`, but it does NOT copy the `public/` folder,
// the `.next/static/` assets, or any non-imported files like schema.sql —
// Next.js expects you to copy those yourself for a standalone deployment.
// This script does that, and also stages the result under
// `src-tauri/resources/server/`, which `tauri.conf.json` bundles into the
// installer as a resource. src-tauri/src/main.rs runs `server.js` from
// there at runtime.

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.error(
    "Error: .next/standalone was not created. Check that next.config.js has output: \"standalone\"."
  );
  process.exit(1);
}

function copy(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skipping copy — not found: ${src}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
}

// 1. Assets Next.js standalone output needs but doesn't copy automatically.
copy(path.join(root, "public"), path.join(standaloneDir, "public"));
copy(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));

// 2. schema.sql — src/lib/db/index.ts falls back to reading it from the
//    server's working directory when the source-tree path isn't present
//    (which is the case once packaged).
copy(path.join(root, "src", "lib", "db", "schema.sql"), path.join(standaloneDir, "schema.sql"));

// 3. Stage everything under src-tauri/resources/server for Tauri to bundle.
const tauriResourceDir = path.join(root, "src-tauri", "resources", "server");
fs.rmSync(tauriResourceDir, { recursive: true, force: true });
copy(standaloneDir, tauriResourceDir);

console.log("\nStandalone server prepared for Tauri packaging.");
console.log(`  -> ${path.relative(root, tauriResourceDir)}`);
