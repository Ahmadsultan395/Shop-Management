import { NextRequest } from "next/server";
import { listProducts, createProduct, productNameExists } from "@/lib/db/products";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as "all" | "active" | "inactive") ?? "active";
  const products = listProducts({ search, status });
  return jsonOk({ products });
}

export async function POST(req: NextRequest) {
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
  else if (productNameExists(name)) fields.name = "A product with this name already exists.";
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const product = createProduct({ name: name!, category, unit, notes });
  return jsonOk({ product }, 201);
}
