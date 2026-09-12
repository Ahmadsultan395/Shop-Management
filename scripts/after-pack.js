// Runs automatically by electron-builder AFTER it has assembled the final
// app bundle (see package.json -> build.afterPack). This is deliberately
// the LAST thing that touches better-sqlite3's native binary — rebuilding
// it here, directly inside the packaged app's own Resources/server folder,
// means there is no later copy/packaging step that could overwrite it with
// an unrebuilt version.

const path = require("node:path");
const { rebuild } = require("@electron/rebuild");
const { Arch } = require("electron-builder");

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager, arch } = context;
  const electronVersion = require("electron/package.json").version;
  const archName = Arch[arch];

  const resourcesDir =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");

  const buildPath = path.join(resourcesDir, "server");

  console.log(
    `[afterPack] Rebuilding better-sqlite3 for Electron ${electronVersion} (${archName}) at: ${buildPath}`
  );

  await rebuild({
    buildPath,
    electronVersion,
    arch: archName,
    onlyModules: ["better-sqlite3"],
    force: true,
  });

  console.log("[afterPack] better-sqlite3 rebuild complete.");
};
