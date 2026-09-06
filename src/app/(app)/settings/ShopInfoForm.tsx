"use client";

import { useState, FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import type { Settings } from "@/types";

export function ShopInfoForm({ initial }: { initial: Settings }) {
  const [shopName, setShopName] = useState(initial.shop_name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [currency, setCurrency] = useState(initial.currency);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFields({});
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_name: shopName, phone, address, currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Could not save settings." });
        setFields(data.fields ?? {});
        return;
      }
      setMessage({ type: "success", text: "Settings saved." });
    } catch {
      setMessage({ type: "error", text: "Could not reach the local server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel max-w-md space-y-4 p-5">
      <h2 className="text-sm font-medium">Shop Information</h2>
      <TextField
        label="Shop / Business Name"
        value={shopName}
        onChange={(e) => setShopName(e.target.value)}
        error={fields.shop_name}
        required
      />
      <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <SelectField
        label="Currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        error={fields.currency}
      >
        <option value="PKR">PKR — Pakistani Rupee (Rs.)</option>
        <option value="USD">USD — US Dollar ($)</option>
        <option value="AED">AED — UAE Dirham</option>
        <option value="SAR">SAR — Saudi Riyal</option>
      </SelectField>

      {message && (
        <p
          className={
            message.type === "success"
              ? "rounded bg-stamp-green/10 px-3 py-2 text-sm text-stamp-green"
              : "rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" loading={loading}>
        Save Settings
      </Button>
    </form>
  );
}
