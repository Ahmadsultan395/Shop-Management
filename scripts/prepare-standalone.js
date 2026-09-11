// Runs automatically after `next build` (see package.json "postbuild").
//
// `next build` with output:"standalone" produces `.next/standalone/server.js`
// plus a trimmed `node_modules`, but it does NOT copy the `public/` folder,
// the `.next/static/` assets, or any non-imported files like schema.sql —
// Next.js expects you to copy those yourself for a standalone deployment.
// electron-builder then packages the whole `.next/standalone` folder as-is
// (see package.json -> build.extraResources), so it must be complete
// before that step runs.

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

copy(path.join(root, "public"), path.join(standaloneDir, "public"));
copy(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
copy(path.join(root, "src", "lib", "db", "schema.sql"), path.join(standaloneDir, "schema.sql"));

console.log("\nStandalone server ready for Electron packaging.");
console.log(`  -> ${path.relative(root, standaloneDir)}`);
