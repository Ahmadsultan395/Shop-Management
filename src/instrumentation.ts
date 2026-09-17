export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize the DB (which loads sql.js) before the first request
    // arrives. This is the ONLY way to guarantee synchronous getDb() calls
    // succeed on the very first request.
    const { initDb } = await import("./lib/db/index");
    await initDb();
  }
}