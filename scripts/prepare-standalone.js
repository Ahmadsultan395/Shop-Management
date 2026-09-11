const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

if (!fs.existsSync(standaloneDir)) {
console.error(
'Error: .next/standalone was not created. Make sure next.config.js has output: "standalone".'
);
process.exit(1);
}

function copy(src, dest) {
if (!fs.existsSync(src)) {
console.warn(Skipping copy — not found: ${src});
return;
}

fs.mkdirSync(path.dirname(dest), { recursive: true });

fs.cpSync(src, dest, {
recursive: true,
force: true
});

console.log(
Copied ${path.relative(root, src)} -> ${path.relative(root, dest)}
);
}

// Copy public assets.
copy(
path.join(root, "public"),
path.join(standaloneDir, "public")
);

// Copy Next.js static assets.
copy(
path.join(root, ".next", "static"),
path.join(standaloneDir, ".next", "static")
);

// Copy database schema.
copy(
path.join(root, "src", "lib", "db", "schema.sql"),
path.join(standaloneDir, "schema.sql")
);

console.log("");
console.log("Standalone server ready for Electron packaging.");
console.log( -> ${path.relative(root, standaloneDir)});
