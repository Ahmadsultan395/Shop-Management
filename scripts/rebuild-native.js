const fs = require("node:fs");
const path = require("node:path");
const { rebuild } = require("@electron/rebuild");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const electronVersion = require("electron/package.json").version;

async function main() {
  if (!fs.existsSync(standaloneDir)) {
    throw new Error(
      "ERROR: .next/standalone does not exist. next build must finish first."
    );
  }

  console.log(
    `Rebuilding better-sqlite3 for Electron ${electronVersion}...`
  );

  await rebuild({
    buildPath: standaloneDir,
    electronVersion,
    arch: process.arch,
    force: true,
    onlyModules: ["better-sqlite3"]
  });

  const nativeBinary = path.join(
    standaloneDir,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );

  if (!fs.existsSync(nativeBinary)) {
    throw new Error(
      `ERROR: Electron native binary was not created:\n${nativeBinary}`
    );
  }

  console.log("SUCCESS: better-sqlite3 rebuilt for Electron.");
  console.log(`Binary: ${nativeBinary}`);
}

main().catch((error) => {
  console.error("Native module rebuild FAILED:");
  console.error(error);
  process.exit(1);
});
