import { NextRequest } from "next/server";
import { getPurchaseReport } from "@/lib/db/reports";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import { jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") as DateRangePreset) ?? "all";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");
  const { from, to } = resolveDateRange(range, customFrom, customTo);

  const supplierId = searchParams.get("supplierId");
  const productId = searchParams.get("productId");

  const report = getPurchaseReport({
    from,
    to,
    supplierId: supplierId ? Number(supplierId) : undefined,
    productId: productId ? Number(productId) : undefined,
  });

  return jsonOk({ ...report, from, to });
}
