"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function PurchaseActions({ purchaseId, isVoid }: { purchaseId: number; isVoid: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleToggleVoid() {
    setLoading(true);
    try {
      await fetch(`/api/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_void: !isVoid }),
      });
      setShowConfirm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="no-print flex gap-2">
      <Button variant="secondary" onClick={() => window.print()}>
        Print
      </Button>
      {!isVoid && (
        <Link href={`/purchases/${purchaseId}/edit`}>
          <Button variant="secondary">Edit</Button>
        </Link>
      )}
      <Button variant={isVoid ? "primary" : "danger"} onClick={() => setShowConfirm(true)}>
        {isVoid ? "Restore" : "Void"}
      </Button>

      {showConfirm && (
        <ConfirmDialog
          title={isVoid ? "Restore this purchase?" : "Void this purchase?"}
          message={
            isVoid
              ? "This purchase will count again in totals and reports."
              : "This purchase will be excluded from totals and reports, but kept for record-keeping. You can restore it later."
          }
          confirmLabel={isVoid ? "Restore" : "Void"}
          variant={isVoid ? "primary" : "danger"}
          loading={loading}
          onConfirm={handleToggleVoid}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
