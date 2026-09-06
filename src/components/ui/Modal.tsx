"use client";

import { ReactNode, useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className={`w-full ${maxWidth} rounded bg-white shadow-lg`}>
        <div className="flex items-center justify-between border-b border-paper-line px-5 py-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-ink-soft hover:bg-paper hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
