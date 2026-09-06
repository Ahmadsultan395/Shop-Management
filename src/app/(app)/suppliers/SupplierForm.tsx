"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { Button } from "@/components/ui/Button";
import type { Supplier } from "@/types";

export function SupplierForm({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(supplier);
  const [name, setName] = useState(supplier?.name ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setLoading(true);
    try {
      const url = isEdit ? `/api/suppliers/${supplier!.id}` : "/api/suppliers";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save supplier.");
        setFields(data.fields ?? {});
        return;
      }
      onSaved();
    } catch {
      setError("Could not reach the local server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Supplier" : "Add Supplier"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fields.name}
          autoFocus
          required
        />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
        <TextareaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add supplier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
