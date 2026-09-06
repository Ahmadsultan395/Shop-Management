# Packaging Guide (Developer) — Building ShopManagerSetup.exe

This turns the Next.js + SQLite source in this repo into a double-click
Windows installer. You only need to do this on a Windows machine with
internet access (to fetch the Rust/Node toolchains and packages once) —
the internet is never needed by the customer who receives the installer.

This guide has **not been run or compiled** in the sandbox this project was
written in (no internet/Rust toolchain available there). Follow it on your
own Windows dev machine and adjust if a version mismatch trips you up —
the architecture is standard, but exact CLI flags do drift between Tauri
versions.

## One-time developer machine setup

1. Install [Node.js 18+](https://nodejs.org) (LTS).
2. Install [Rust](https://rustup.rs) (`rustup-init.exe`, default options).
3. Install the Tauri v1 build prerequisites for Windows: Microsoft C++
   Build Tools and WebView2 (see
   https://tauri.app/v1/guides/getting-started/prerequisites — WebView2 is
   preinstalled on Windows 11 and most updated Windows 10 machines).

## One-time project setup

```bash
cd shop-manager
npm install
```

### 1. Get a Node.js binary to bundle as the sidecar

The packaged app needs to carry its own copy of Node.js so the customer
never installs anything. Tauri's "sidecar" mechanism expects a renamed
binary matching your Rust build target triple.

1. Download the **Windows binary** (not the installer) for Node 18 or 20
   from https://nodejs.org/en/download — e.g. `node-v20.x.x-win-x64.zip`.
2. Extract it and copy `node.exe` into this project at:
   ```
   src-tauri/binaries/node-x86_64-pc-windows-msvc.exe
   ```
   (Run `rustc -Vv` and check the `host:` line if you're not on standard
   x86_64 Windows — the suffix must match your Rust target triple exactly.)

### 2. Generate app icons

```bash
npx @tauri-apps/cli icon path/to/your-logo.png
```

This fills in `src-tauri/icons/` with all the sizes `tauri.conf.json`
references (32x32.png, 128x128.png, icon.ico, etc). Use a square PNG, at
least 512x512, as the source.

### 3. Build the Next.js app + stage it for Tauri

```bash
npm run build
```

This runs `next build` (producing `.next/standalone/`) and then the
`postbuild` script (`scripts/prepare-standalone.js`), which copies the
static assets and `schema.sql` into the standalone folder and stages the
whole thing at `src-tauri/resources/server/` — this is what
`tauri.conf.json`'s `bundle.resources` packages into the installer.

### 4. Build the Windows installer

```bash
npm run tauri:build
```

On success, Tauri prints the location of the generated installer, typically:

```
src-tauri/target/release/bundle/nsis/Shop Manager_1.0.0_x64-setup.exe
```

Rename it to `ShopManagerSetup.exe` for delivery if you like — the name is
cosmetic.

### Trying it during development

```bash
npm run tauri:dev
```

This runs the Next.js dev server and opens it in a Tauri window without
building an installer — good for quickly checking that the desktop shell
loads correctly. (Note: `main.rs`'s sidecar-spawning setup is written for
the **built** server; for `tauri:dev` you may prefer to temporarily point
the window at `http://localhost:3000` instead of spawning the sidecar —
see the comments in `src-tauri/src/main.rs`.)

## What to test before shipping

Follow `docs/CLIENT_INSTALLATION_GUIDE.md` on a clean Windows machine (or a
VM) that has never had Node.js installed, with the network disconnected
after installation, and go through every module once — see the checklist
in the main `README.md`'s testing section.

## Where the customer's data lives

The app stores its SQLite database in the standard per-user app-data
folder (e.g. `%APPDATA%\com.shopmanager.desktop\`), never inside the
installed Program Files folder — this is set up in `src-tauri/src/main.rs`
via `app_data_dir()` and passed to the server as `SHOP_MANAGER_DATA_DIR`.
This is also where `Backup`/`Restore` read and write.
