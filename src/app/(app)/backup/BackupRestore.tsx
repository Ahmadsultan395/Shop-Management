"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function BackupRestore() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [restoreDone, setRestoreDone] = useState(false);

  function handleBackup() {
    // A plain navigation (not fetch+blob) lets the browser's own download
    // handling take over — including its "choose a folder" save dialog if
    // the browser/OS is configured to ask before every download.
    window.location.href = "/api/backup";
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    setValidating(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/backup/validate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "This file could not be validated.");
        return;
      }
      setPendingFile(file);
    } catch {
      setError("Could not reach the local server.");
    } finally {
      setValidating(false);
    }
  }

  async function handleConfirmRestore() {
    if (!pendingFile) return;
    setRestoring(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      const res = await fetch("/api/backup/restore", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Restore failed.");
        setPendingFile(null);
        return;
      }
      setPendingFile(null);
      setRestoreDone(true);
      // The database has been swapped out from under the current session —
      // log out and send everyone back to a clean login screen.
      await fetch("/api/auth/logout", { method: "POST" });
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="panel max-w-md space-y-4 p-5">
      <h2 className="text-sm font-medium">Backup / Restore</h2>
      <p className="text-sm text-ink-soft">
        This app is fully offline — your data only exists on this computer. Back up regularly and
        copy the backup file to a USB drive or another safe location.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleBackup}>
          Download Backup
        </Button>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={validating}>
          Restore from Backup
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {error && <p className="rounded bg-stamp-red/10 px-3 py-2 text-sm text-stamp-red">{error}</p>}

      {restoreDone && (
        <p className="rounded bg-stamp-green/10 px-3 py-2 text-sm text-stamp-green">
          Data restored. A safety copy of your previous data was saved automatically. Redirecting to
          login...
        </p>
      )}

      {pendingFile && (
        <ConfirmDialog
          title="Restore this backup?"
          message={`Your current data will be replaced with the contents of "${pendingFile.name}". A safety copy of your current data is made automatically before restoring, but this cannot be undone from within the app.`}
          confirmLabel="Restore"
          variant="danger"
          loading={restoring}
          onConfirm={handleConfirmRestore}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}
