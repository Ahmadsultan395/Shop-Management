"use client";

import { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextareaField({ label, error, className, id, ...rest }: TextareaFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <textarea id={inputId} rows={3} className={cn("field-input resize-none", className)} {...rest} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
