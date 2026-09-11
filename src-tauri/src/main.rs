// Shop Manager desktop shell.
//
// The actual app (UI + API routes + SQLite access) is the Next.js
// "standalone" server built by `npm run build`. This Rust process does
// three things only:
//   1. Resolves a writable per-user folder for the database.
//   2. Spawns the bundled Node.js + server.js as a background ("sidecar")
//      process, pointed at that folder.
//   3. Opens a normal window and loads http://127.0.0.1:<port> once the
//      server responds — from the customer's point of view this is just
//      "the app opened", with no browser chrome, no address bar, and no
//      terminal window.
//
// This file is written for Tauri v1 (see src-tauri/Cargo.toml). It has not
// been compiled in this environment (no network/Rust toolchain available
// here) — build and test it on your Windows development machine, and treat
// the comments below as a guide to what each part needs to do.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::api::process::{Command, CommandChild, CommandEvent};
use tauri::Manager;

const SERVER_PORT: u16 = 3457;

struct ServerProcess(Mutex<Option<CommandChild>>);

fn wait_for_server(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    false
}

fn main() {
    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle();

            // Per-user, always-writable folder for the SQLite database and
            // session key — never write inside the installed app's own
            // folder (Program Files is read-only for normal users).
            let data_dir = handle
                .path_resolver()
                .app_data_dir()
                .expect("could not resolve app data directory");
            std::fs::create_dir_all(&data_dir).expect("could not create app data directory");

            // The bundled server lives under the app's resource directory
            // once packaged (see tauri.conf.json -> bundle.resources).
            let resource_dir = handle
                .path_resolver()
                .resource_dir()
                .expect("could not resolve resource directory");
            let server_js = resource_dir.join("server").join("server.js");

            let mut env = HashMap::new();
            env.insert("PORT".to_string(), SERVER_PORT.to_string());
            env.insert(
                "SHOP_MANAGER_DATA_DIR".to_string(),
                data_dir.to_string_lossy().to_string(),
            );
            // Standalone Next.js servers bind 0.0.0.0 by default; keep it to
            // localhost only since this app has no business listening on
            // the network.
            env.insert("HOSTNAME".to_string(), "127.0.0.1".to_string());

            let (mut rx, child) = Command::new_sidecar("node")
                .expect("failed to create the `node` sidecar command — check tauri.conf.json externalBin")
                .args([server_js.to_string_lossy().to_string()])
                .envs(env)
                .spawn()
                .expect("failed to spawn the bundled server process");

            *app.state::<ServerProcess>().0.lock().unwrap() = Some(child);

            // Surface server logs in a dev console; harmless in release
            // builds where no console is attached.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => println!("[server] {line}"),
                        CommandEvent::Stderr(line) => eprintln!("[server] {line}"),
                        _ => {}
                    }
                }
            });

            if !wait_for_server(SERVER_PORT, Duration::from_secs(20)) {
                eprintln!(
                    "Shop Manager's local server did not respond within 20 seconds. \
                     The window will still try to load — if it stays blank, restart the app."
                );
            }

            let url = format!("http://127.0.0.1:{SERVER_PORT}")
                .parse()
                .expect("invalid server URL");
            tauri::WindowBuilder::new(&handle, "main", tauri::WindowUrl::External(url))
                .title("Shop Manager")
                .inner_size(1280.0, 800.0)
                .min_inner_size(1024.0, 700.0)
                .build()?;

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Make sure the sidecar server process doesn't linger after
                // the window closes.
                let state = event.window().state::<ServerProcess>();
                if let Some(child) = state.0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the Shop Manager application");
}
