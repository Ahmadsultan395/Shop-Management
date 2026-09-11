# Packaging Guide (Developer) — Building Windows & macOS Installers

This project now uses **Electron** (not Tauri) to package the app for
Windows and macOS. This is simpler and more reliable than the previous
Tauri "sidecar" setup because Electron already ships a full Node.js
runtime internally — there's no separate Node.js binary to download,
rename, and bundle, and no resource-folder-flattening issues.

## How it works

- `electron/main.js` is the desktop shell. On launch it:
  1. Resolves a per-user, always-writable data folder (via Electron's
     `app.getPath("userData")`).
  2. Forks the built Next.js **standalone** server (`server.js`) as a
     child process — using Electron's own bundled Node.js, so nothing
     extra needs to be installed or bundled separately.
  3. Waits for the server to respond, then opens a normal window pointed
     at `http://127.0.0.1:3457`.
- `electron-builder` packages `electron/main.js` plus the built standalone
  server folder into a Windows installer (`.exe`, via NSIS) and a macOS
  disk image (`.dmg`).

## Building locally

You need Node.js 18+ (already installed if you got this far).

```bash
npm install
npm run electron:build
```

This runs, in order:
1. `next build` — builds the Next.js app.
2. `postbuild` (`scripts/prepare-standalone.js`) — copies `public/`,
   `.next/static/`, and `schema.sql` into `.next/standalone/`, since
   Next.js's standalone output doesn't include those automatically.
3. `electron-builder` — packages everything into an installer for
   whichever OS you're running this command on (Windows → `.exe` on a
   Windows machine, macOS → `.dmg` on a Mac; electron-builder does not
   reliably cross-build from one OS to another, which is why the GitHub
   Actions workflow below runs one job per OS).

The finished installer appears under `dist-electron/`.

## Building both Windows and macOS via GitHub Actions

`.github/workflows/build.yml` builds both platforms in one click, each on
its native OS runner (so there's no cross-compilation guesswork):

1. Push this project to GitHub if you haven't already.
2. Go to the repo's **Actions** tab → **Build Desktop Installers** →
   **Run workflow**.
3. Wait for both jobs (Windows, macOS) to finish (a few minutes each).
4. Open the finished run's summary page → **Artifacts** → download
   `shop-manager-Windows` and `shop-manager-macOS`. Each is a zip
   containing the `.exe` / `.dmg` respectively.

## Trying it during development

```bash
npm run build          # build the Next.js app first
npm run electron:dev   # opens the app in an Electron window
```

## App icons

Placeholder icons are already included at `electron/icons/` (a simple
navy "S" mark) so builds work out of the box. To use your own logo:

```bash
npx electron-icon-builder --input=path/to/logo.png --output=electron/icons --flatten
```

Then copy the generated `icon.ico` (Windows) and `icon.icns` (macOS) into
`electron/icons/`, replacing the placeholders. `logo.png` should be a
square image, ideally 512x512 or larger.

## Where the customer's data lives

The SQLite database lives in the OS's standard per-user app-data folder
(via Electron's `app.getPath("userData")` — e.g. `%APPDATA%\Shop Manager`
on Windows, `~/Library/Application Support/Shop Manager` on macOS), never
inside the installed app's own folder. This is also where Backup/Restore
read and write.

## Common issues

- **"App can't be opened because it is from an unidentified developer"
  (macOS)**: expected for an unsigned/unnotarized app. Right-click the app
  → Open, or run `xattr -cr "/Applications/Shop Manager.app"` once.
- **"Windows protected your PC"**: expected for an unsigned installer.
  Click "More info" → "Run anyway".
- Both of the above go away once/if the app is code-signed with a paid
  Apple Developer / Windows code-signing certificate — not required for
  internal or small-business distribution, just an extra click for the
  installer each time.
