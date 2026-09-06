import { NextRequest } from "next/server";
import { listSuppliers, createSupplier, supplierNameExists } from "@/lib/db/suppliers";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as "all" | "active" | "inactive") ?? "active";
  const suppliers = listSuppliers({ search, status });
  return jsonOk({ suppliers });
}

export async function POST(req: NextRequest) {
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
  else if (supplierNameExists(name)) fields.name = "A supplier with this name already exists.";
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const supplier = createSupplier({ name: name!, phone, address, notes });
  return jsonOk({ supplier }, 201);
}
