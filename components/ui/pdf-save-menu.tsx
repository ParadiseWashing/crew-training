"use client";

import * as React from "react";
import { FileDown, Eye, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfSaveMenuProps {
  /** URL that returns the PDF with an attachment Content-Disposition. */
  downloadUrl: string;
  /** Button label. Defaults to "View / Save". */
  label?: string;
  className?: string;
}

/**
 * A small button that opens a tiny floating menu (like a right-click menu)
 * with a "Save as PDF" action. Clicking the action downloads the file to the
 * user's device. The server names the file via its Content-Disposition header.
 */
export function PdfSaveMenu({ downloadUrl, label = "View / Save", className }: PdfSaveMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function preview() {
    const sep = downloadUrl.includes("?") ? "&" : "?";
    window.open(`${downloadUrl}${sep}view=1`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function saveAsPdf() {
    const a = document.createElement("a");
    a.href = downloadUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-accent-soft hover:bg-accent-tint/40 transition-colors"
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={preview}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 text-gray-400" />
            Preview
          </button>
          <button
            type="button"
            onClick={saveAsPdf}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileDown className="h-4 w-4 text-gray-400" />
            Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
