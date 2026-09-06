"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/types";

type StatusFilter = "active" | "inactive" | "all";

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleToggleActive() {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await fetch(`/api/products/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: toggleTarget.is_active === 0 }),
      });
      setToggleTarget(null);
      load();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Items you regularly purchase for the shop."
        actions={<Button onClick={() => setShowForm(true)}>Add Product</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <TextField
            label=""
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["active", "inactive", "all"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium capitalize transition ${
                status === s
                  ? "border-ledger bg-ledger text-white"
                  : "border-paper-line bg-white text-ink-soft hover:bg-paper"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <EmptyState message="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState message="No products found. Add your first product to get started." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-paper-line last:border-0 hover:bg-paper/50">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="font-medium text-ledger hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{p.category || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.unit || "—"}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={p.is_active === 1} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs">
                      <button onClick={() => setEditingProduct(p)} className="text-ledger hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setToggleTarget(p)}
                        className={p.is_active ? "text-stamp-red hover:underline" : "text-stamp-green hover:underline"}
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            load();
          }}
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active ? "Deactivate product?" : "Activate product?"}
          message={
            toggleTarget.is_active
              ? `"${toggleTarget.name}" will be hidden from new purchases but its purchase history is kept.`
              : `"${toggleTarget.name}" will be available again for new purchases.`
          }
          confirmLabel={toggleTarget.is_active ? "Deactivate" : "Activate"}
          variant={toggleTarget.is_active ? "danger" : "primary"}
          loading={toggling}
          onConfirm={handleToggleActive}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}
