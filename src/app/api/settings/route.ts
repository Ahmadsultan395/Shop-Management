import { NextRequest } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { jsonError, jsonOk, isNonEmptyString } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  return jsonOk({ settings: getSettings() });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.");
  const { shop_name, phone, address, currency } = body as {
    shop_name?: string;
    phone?: string;
    address?: string;
    currency?: string;
  };

  const fields: Record<string, string> = {};
  if (!isNonEmptyString(shop_name)) fields.shop_name = "Shop name is required.";
  if (!isNonEmptyString(currency)) fields.currency = "Currency is required.";
  if (Object.keys(fields).length > 0) return jsonError("Please fix the highlighted fields.", 400, fields);

  const settings = updateSettings({
    shop_name: shop_name!.trim(),
    phone: phone || null,
    address: address || null,
    currency: currency!.trim(),
  });
  return jsonOk({ settings });
}
