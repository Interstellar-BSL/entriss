"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 motion-safe:animate-alive-fade-in">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--foreground)]/40 motion-safe:animate-alive-fade-in"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 flex max-h-[min(90vh,100%)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl motion-safe:animate-alive-modal-in",
          className,
        )}
      >
        <div className="shrink-0 border-b border-[var(--border)] px-5 py-4">
          <h2
            id="modal-title"
            className="text-base font-semibold text-[var(--foreground)]"
          >
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
