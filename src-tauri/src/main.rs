// Shop Manager desktop shell.
//
// The actual app (UI + API routes + SQLite access) is the Next.js
// "standalone" server built by `npm run build`. This Rust process does
// three things:
//   1. Resolves a writable per-user folder for the database.
//   2. Spawns the bundled Node.js + server.js as a background sidecar.
//   3. Opens the app window and loads the local server.
//
// Tauri v1.

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

            // ------------------------------------------------------------
            // Application data directory
            // ------------------------------------------------------------

            // This is a writable per-user directory.
            // The SQLite database should NOT be stored inside Program Files.
            let data_dir = handle
                .path_resolver()
                .app_data_dir()
                .expect("could not resolve app data directory");

            std::fs::create_dir_all(&data_dir)
                .expect("could not create app data directory");

            // ------------------------------------------------------------
            // Bundled Next.js server
            // ------------------------------------------------------------

            let resource_dir = handle
                .path_resolver()
                .resource_dir()
                .expect("could not resolve resource directory");

            let server_js = resource_dir
                .join("server")
                .join("server.js");

            // ------------------------------------------------------------
            // Environment variables for Next.js
            // ------------------------------------------------------------

            let mut env = HashMap::new();

            env.insert(
                "PORT".to_string(),
                SERVER_PORT.to_string(),
            );

            env.insert(
                "SHOP_MANAGER_DATA_DIR".to_string(),
                data_dir.to_string_lossy().to_string(),
            );

            // Only listen on localhost.
            env.insert(
                "HOSTNAME".to_string(),
                "127.0.0.1".to_string(),
            );

            // ------------------------------------------------------------
            // Start bundled Node.js sidecar
            // ------------------------------------------------------------

            let (mut rx, child) = Command::new_sidecar("node")
                .expect(
                    "failed to create the node sidecar command. \
                     Check tauri.conf.json externalBin."
                )
                .args([
                    server_js
                        .to_string_lossy()
                        .to_string()
                ])
                .envs(env)
                .spawn()
                .expect("failed to spawn the bundled server process");

            // Store child process so we can terminate it when
            // the application window closes.
            *app.state::<ServerProcess>()
                .0
                .lock()
                .unwrap() = Some(child);

            // ------------------------------------------------------------
            // Forward Node.js server logs
            // ------------------------------------------------------------

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[server] {line}");
                        }

                        CommandEvent::Stderr(line) => {
                            eprintln!("[server] {line}");
                        }

                        _ => {}
                    }
                }
            });

            // ------------------------------------------------------------
            // Wait for Next.js server
            // ------------------------------------------------------------

            if !wait_for_server(
                SERVER_PORT,
                Duration::from_secs(20),
            ) {
                eprintln!(
                    "Shop Manager local server did not respond \
                     within 20 seconds."
                );
            }

            // ------------------------------------------------------------
            // Open application window
            // ------------------------------------------------------------

            let url = format!(
                "http://127.0.0.1:{SERVER_PORT}"
            )
            .parse()
            .expect("invalid server URL");

            tauri::WindowBuilder::new(
                &handle,
                "main",
                tauri::WindowUrl::External(url),
            )
            .title("Shop Manager")
            .inner_size(1280.0, 800.0)
            .min_inner_size(1024.0, 700.0)
            .build()?;

            Ok(())
        })

        // ------------------------------------------------------------
        // Close application
        // ------------------------------------------------------------

        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } =
                event.event()
            {
                let state =
                    event.window().state::<ServerProcess>();

                // IMPORTANT:
                // Take the child out of the Mutex first.
                //
                // This makes the MutexGuard disappear BEFORE
                // child.kill() is called and fixes the Rust
                // "borrowed value does not live long enough" error.

                let child = {
                    let mut guard =
                        state.0.lock().unwrap();

                    guard.take()
                };

                // MutexGuard is now dropped.

                if let Some(child) = child {
                    let _ = child.kill();
                }
            }
        })

        // ------------------------------------------------------------
        // Start Tauri
        // ------------------------------------------------------------

        .run(tauri::generate_context!())
        .expect(
            "error while running the Shop Manager application"
        );
}
