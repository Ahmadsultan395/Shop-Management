"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types";

export function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setLoading(true);
    try {
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, unit, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save product.");
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
    <Modal title={isEdit ? "Edit Product" : "Add Product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fields.name}
          autoFocus
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <TextField
            label="Unit (optional)"
            placeholder="pcs, box, kg..."
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
        <TextareaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
