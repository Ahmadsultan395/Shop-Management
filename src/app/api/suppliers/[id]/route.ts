import { NextRequest } from "next/server";
import {
  getSupplierById,
  updateSupplier,
  setSupplierActive,
  supplierNameExists,
} from "@/lib/db/suppliers";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid supplier id.", 400);
  const supplier = getSupplierById(id);
  if (!supplier) return jsonError("Supplier not found.", 404);
  return jsonOk({ supplier });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid supplier id.", 400);
  const existing = getSupplierById(id);
  if (!existing) return jsonError("Supplier not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const { name, phone, address, notes } = body as {
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(name)) fields.name = "Supplier name is required.";
  else if (supplierNameExists(name, id)) fields.name = "A supplier with this name already exists.";
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const supplier = updateSupplier(id, { name: name!, phone, address, notes });
  return jsonOk({ supplier });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid supplier id.", 400);
  const existing = getSupplierById(id);
  if (!existing) return jsonError("Supplier not found.", 404);

  const body = await req.json().catch(() => null);
  const { is_active } = (body ?? {}) as { is_active?: boolean };
  if (typeof is_active !== "boolean") return jsonError("is_active must be true or false.");

  setSupplierActive(id, is_active);
  return jsonOk({ supplier: getSupplierById(id) });
}
