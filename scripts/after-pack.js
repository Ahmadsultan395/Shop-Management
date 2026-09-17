// after-pack.js
//
// Previously this script rebuilt better-sqlite3's native binary inside the
// packaged app. That step is no longer needed: the database is now sql.js
// (pure WebAssembly), which has no native binary to rebuild.
//
// Kept as a no-op so electron-builder's afterPack hook (if still referenced
// anywhere) doesn't crash.

module.exports = async function afterPack() {
  // nothing to do
};
