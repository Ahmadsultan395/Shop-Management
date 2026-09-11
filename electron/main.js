// Shop Manager desktop shell (Electron).
//
// The actual app (UI + API routes + SQLite access) is the Next.js
// "standalone" server built by `npm run build`. This file does three
// things only:
//   1. Resolves a writable per-user folder for the database
//      (Electron's own app.getPath("userData")).
//   2. Forks the bundled server.js as a child process. Electron ships a
//      full Node.js runtime internally, so `child_process.fork()` here
//      runs it as plain Node — no separate Node.js binary needs to be
//      downloaded/bundled/renamed (this is what made the previous Tauri
//      "sidecar" approach so fragile).
//   3. Opens a normal window and loads http://127.0.0.1:<port> once the
//      server responds.

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const net = require("node:net");
const { fork } = require("node:child_process");

const SERVER_PORT = 3457;

let serverProcess = null;
let mainWindow = null;

function getServerJsPath() {
  if (app.isPackaged) {
    // electron-builder copies .next/standalone here via "extraResources"
    // (see package.json -> build.extraResources).
    return path.join(process.resourcesPath, "server", "server.js");
  }
  // In development, run `npm run build` first so this exists.
  return path.join(__dirname, "..", ".next", "standalone", "server.js");
}

function waitForServer(port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    function attempt() {
      const socket = net.createConnection({ port, host: "127.0.0.1" });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(attempt, 150);
        }
      });
    }
    attempt();
  });
}

async function startServer() {
  const serverJs = getServerJsPath();
  const dataDir = app.getPath("userData");

  serverProcess = fork(serverJs, [], {
    cwd: path.dirname(serverJs),
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      HOSTNAME: "127.0.0.1",
      SHOP_MANAGER_DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  serverProcess.stdout?.on("data", (chunk) => console.log(`[server] ${chunk}`.trim()));
  serverProcess.stderr?.on("data", (chunk) => console.error(`[server] ${chunk}`.trim()));
  serverProcess.on("exit", (code) => console.log(`[server] exited with code ${code}`));

  const ready = await waitForServer(SERVER_PORT, 20000);
  if (!ready) {
    console.error(
      "Shop Manager's local server did not respond within 20 seconds. The window will still try to load."
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "Shop Manager",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function killServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.on("window-all-closed", () => {
  killServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", killServer);
