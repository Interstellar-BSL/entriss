import type { ScanHint } from "@/lib/kiosk/scan-ignore";
import { cn } from "@/lib/utils/cn";

export function KioskScanHint({ hint }: { hint: ScanHint | null }) {
  if (!hint) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mb-2 rounded-lg border px-3 py-2 text-sm font-medium",
        hint.type === "info"
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      {hint.message}
    </div>
  );
}
