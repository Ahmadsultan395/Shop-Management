// Electron bundles its own build of Node.js, which has a different native
// module ABI version than plain Node.js. better-sqlite3's compiled .node
// binary — built during `npm install` against whatever Node.js ran that
// install — will not load inside Electron unless it's rebuilt specifically
// against Electron's ABI. This runs automatically as part of `npm run
// build` (see package.json "postbuild") so both `electron:dev` and
// `electron:build` always ship a working binary.

const path = require("node:path");
const { rebuild } = require("@electron/rebuild");

const electronVersion = require("electron/package.json").version;
const buildPath = path.join(process.cwd(), ".next", "standalone");

rebuild({
  buildPath,
  electronVersion,
  onlyModules: ["better-sqlite3"],
  force: true,
})
  .then(() => {
    console.log(`Rebuilt better-sqlite3 for Electron ${electronVersion} in ${buildPath}`);
  })
  .catch((err) => {
    console.error("Native module rebuild failed:", err);
    process.exit(1);
  });
