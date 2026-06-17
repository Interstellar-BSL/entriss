"use client";

import { memo } from "react";

import { QrScannerPanel } from "@/components/reception/qr-scanner-panel";
import { Drawer } from "@/components/ui/drawer";

export const QrScannerDrawer = memo(function QrScannerDrawer({
  open,
  onClose,
  onManualLookup,
}: {
  open: boolean;
  onClose: () => void;
  onManualLookup?: () => void;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Scan QR"
      className="max-w-lg"
      header={
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Scan QR</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Check visitors in or out with their QR code
          </p>
        </div>
      }
    >
      <QrScannerPanel
        embedded
        onClose={onClose}
        onManualLookup={() => {
          onClose();
          onManualLookup?.();
        }}
      />
    </Drawer>
  );
});
