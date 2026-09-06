"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Topbar({ username }: { username: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-line bg-white px-6">
      <p className="text-sm text-ink-soft">{today}</p>
      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-soft">
          Signed in as <span className="font-medium text-ink">{username}</span>
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-sm text-ledger hover:underline disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}
