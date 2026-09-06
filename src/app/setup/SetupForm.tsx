"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export function SetupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFields({});

    if (password !== confirm) {
      setFields({ confirm: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong.");
        setFields(data.fields ?? {});
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not reach the local server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl">Shop Manager</h1>
          <p className="mt-1 text-sm text-ink-soft">Set up your admin account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-4 p-6">
          <TextField
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fields.username}
            required
          />
          <TextField
            label="Password or PIN"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fields.password}
            required
          />
          <TextField
            label="Confirm password or PIN"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={fields.confirm}
            required
          />

          {formError && (
            <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{formError}</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-soft">
          This account protects your shop data. Keep the password/PIN safe — it can be changed
          later from Settings.
        </p>
      </div>
    </main>
  );
}
