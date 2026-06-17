"use client";

import Link from "next/link";
import { QrCode, Search, UserPlus } from "lucide-react";
import { memo } from "react";

import { receptionCompactButton } from "@/components/reception/reception-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const ReceptionCommandFastActions = memo(function ReceptionCommandFastActions({
  onScanQr,
  onSearch,
}: {
  onScanQr: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(receptionCompactButton, "gap-1.5")}
        onClick={onScanQr}
      >
        <QrCode className="h-3.5 w-3.5" />
        Scan QR
      </Button>
      <Link
        href="/kiosk"
        className={cn(
          receptionCompactButton,
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-muted)]",
        )}
      >
        <UserPlus className="h-3.5 w-3.5" />
        New walk-in
      </Link>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn(receptionCompactButton, "gap-1.5")}
        onClick={onSearch}
      >
        <Search className="h-3.5 w-3.5" />
        Search visitor
      </Button>
    </div>
  );
});
