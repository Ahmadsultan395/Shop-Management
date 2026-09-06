import { NextRequest } from "next/server";
import {
  getProductById,
  updateProduct,
  setProductActive,
  productNameExists,
} from "@/lib/db/products";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid product id.", 400);
  const product = getProductById(id);
  if (!product) return jsonError("Product not found.", 404);
  return jsonOk({ product });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid product id.", 400);
  const existing = getProductById(id);
  if (!existing) return jsonError("Product not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const { name, category, unit, notes } = body as {
    name?: string;
    category?: string;
    unit?: string;
    notes?: string;
  };

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(name)) fields.name = "Product name is required.";
  else if (productNameExists(name, id)) fields.name = "A product with this name already exists.";
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const product = updateProduct(id, { name: name!, category, unit, notes });
  return jsonOk({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (!id) return jsonError("Invalid product id.", 400);
  const existing = getProductById(id);
  if (!existing) return jsonError("Product not found.", 404);

  const body = await req.json().catch(() => null);
  const { is_active } = (body ?? {}) as { is_active?: boolean };
  if (typeof is_active !== "boolean") return jsonError("is_active must be true or false.");

  setProductActive(id, is_active);
  return jsonOk({ product: getProductById(id) });
}
