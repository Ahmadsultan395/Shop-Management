import { NextRequest } from "next/server";
import { listPurchases, createPurchase } from "@/lib/db/purchases";
import { validatePurchaseInput } from "@/lib/validation/purchase";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const supplierId = searchParams.get("supplierId");
  const productId = searchParams.get("productId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = (searchParams.get("status") as "active" | "void" | "all") ?? "active";

  const purchases = listPurchases({
    search,
    supplierId: supplierId ? Number(supplierId) : undefined,
    productId: productId ? Number(productId) : undefined,
    from,
    to,
    status,
  });
  return jsonOk({ purchases });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");

  const result = validatePurchaseInput(body);
  if (!result.ok) return jsonError(result.message!, 400, result.fields);

  const purchase = createPurchase(result.value!);
  return jsonOk({ purchase }, 201);
}
