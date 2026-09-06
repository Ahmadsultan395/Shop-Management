import { NextRequest } from "next/server";
import { getPurchaseDetail, updatePurchase, setPurchaseVoid } from "@/lib/db/purchases";
import { validatePurchaseInput } from "@/lib/validation/purchase";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid purchase id.", 400);
  const purchase = getPurchaseDetail(id);
  if (!purchase) return jsonError("Purchase not found.", 404);
  return jsonOk({ purchase });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid purchase id.", 400);
  const existing = getPurchaseDetail(id);
  if (!existing) return jsonError("Purchase not found.", 404);
  if (existing.is_void) return jsonError("A voided purchase cannot be edited. Restore it first.", 400);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");

  const result = validatePurchaseInput(body);
  if (!result.ok) return jsonError(result.message!, 400, result.fields);

  const purchase = updatePurchase(id, result.value!);
  return jsonOk({ purchase });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid purchase id.", 400);
  const existing = getPurchaseDetail(id);
  if (!existing) return jsonError("Purchase not found.", 404);

  const body = await req.json().catch(() => null);
  const { is_void } = (body ?? {}) as { is_void?: boolean };
  if (typeof is_void !== "boolean") return jsonError("is_void must be true or false.");

  setPurchaseVoid(id, is_void);
  return jsonOk({ purchase: getPurchaseDetail(id) });
}
