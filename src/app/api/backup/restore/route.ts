import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { NextRequest } from "next/server";
import { restoreFromFile } from "@/lib/db/backup";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return jsonError("No file was uploaded.", 400);

  const tempPath = path.join(os.tmpdir(), `shop-manager-restore-${Date.now()}.db`);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    const result = await restoreFromFile(tempPath);
    if (!result.ok) return jsonError(result.message ?? "Restore failed.", 400);

    return jsonOk({ ok: true });
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
