// src/instrumentation.ts
//
// Next.js 14+ automatically calls register() once when the server starts.
// We use it to initialize the database connection before any request is
// handled, so route handlers can call getDb() synchronously.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("@/lib/db");
    await initDb();
  }
}
