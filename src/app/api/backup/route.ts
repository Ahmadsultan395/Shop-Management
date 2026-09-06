import fs from "node:fs";
import { createBackupSnapshot, formatBackupFilename } from "@/lib/db/backup";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  let tempPath: string | null = null;
  try {
    tempPath = await createBackupSnapshot();
    const buffer = fs.readFileSync(tempPath);
    const filename = formatBackupFilename();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return jsonError("Could not create a backup. Please try again.", 500);
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // best-effort cleanup — a leftover temp file is harmless
      }
    }
  }
}
