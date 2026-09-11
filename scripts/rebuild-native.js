const fs = require("node:fs");
const path = require("node:path");
const { rebuild } = require("@electron/rebuild");

const root = process.cwd();
const electronVersion = require("electron/package.json").version;

async function rebuildNative() {
  console.log(
    `Rebuilding better-sqlite3 for Electron ${electronVersion}...`
  );

  // First rebuild the normal project node_modules.
  await rebuild({
    buildPath: root,
    electronVersion,
    arch: process.arch,
    force: true,
    onlyModules: ["better-sqlite3"],
  });

  console.log("Root better-sqlite3 rebuild complete.");

  const standaloneDir = path.join(root, ".next", "standalone");
  const standaloneBetterSqlite = path.join(
    standaloneDir,
    "node_modules",
    "better-sqlite3"
  );

  if (!fs.existsSync(standaloneBetterSqlite)) {
    throw new Error(
      `better-sqlite3 was not found in ${standaloneDir}/node_modules`
    );
  }

  // Rebuild the copy that Next.js placed inside standalone.
  await rebuild({
    buildPath: standaloneDir,
    electronVersion,
    arch: process.arch,
    force: true,
    onlyModules: ["better-sqlite3"],
  });

  console.log(
    `Standalone better-sqlite3 rebuilt successfully for Electron ${electronVersion}.`
  );
}

rebuildNative().catch((error) => {
  console.error("\nNative module rebuild FAILED:");
  console.error(error);
  process.exit(1);
});
