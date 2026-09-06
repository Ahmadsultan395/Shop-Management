"use client";

import { useState, FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setFields({});

    if (newPassword !== confirm) {
      setFields({ confirm: "New password/PIN does not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Could not change password." });
        setFields(data.fields ?? {});
        return;
      }
      setMessage({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setMessage({ type: "error", text: "Could not reach the local server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel max-w-md space-y-4 p-5">
      <h2 className="text-sm font-medium">Change Password / PIN</h2>
      <TextField
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={fields.currentPassword}
        required
      />
      <TextField
        label="New password or PIN"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={fields.newPassword}
        required
      />
      <TextField
        label="Confirm new password or PIN"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={fields.confirm}
        required
      />
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
        Update password
      </Button>
    </form>
  );
}
