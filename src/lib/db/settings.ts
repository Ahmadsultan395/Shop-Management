import { getDb } from "./index";
import type { Settings } from "@/types";

export function getSettings(): Settings {
  return getDb().prepare(`SELECT * FROM settings WHERE id = 1`).get() as Settings;
}

export function updateSettings(input: {
  shop_name: string;
  phone?: string | null;
  address?: string | null;
  currency: string;
}): Settings {
  getDb()
    .prepare(
      `UPDATE settings
       SET shop_name = ?, phone = ?, address = ?, currency = ?, updated_at = datetime('now')
       WHERE id = 1`
    )
    .run(input.shop_name, input.phone ?? null, input.address ?? null, input.currency);
  return getSettings();
}
