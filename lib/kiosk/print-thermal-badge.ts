/**
 * Badge printing — entry points (audit):
 * - components/kiosk/kiosk-booking-badge.tsx      → printThermalBadge()
 * - components/kiosk/kiosk-inline-badge.tsx       → printThermalBadge()
 * - components/visits/badge-preview-modal.tsx     → printThermalBadge()
 *
 * Implementation:
 * - Dedicated print window via window.open() (no noopener — allows document.write)
 * - Static HTML via document.write() + document.close()
 * - QR pre-rendered as base64 data URL before write
 * - Print deferred until images load + layout ready
 */

import QRCode from "qrcode";

import { buildBadgePrintDocument } from "@/lib/kiosk/badge-print-html";
import type { BadgePrintFormat } from "@/lib/kiosk/badge-print-styles";
import type { ThermalBadgeData } from "@/lib/visits/types";

const PRINT_READY_DELAY_MS = 300;

export interface BadgePrintOptions {
  photoUrl?: string | null;
  format?: BadgePrintFormat;
}

async function renderQrDataUrl(
  payload: string,
  size: number,
): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
}

function waitForImages(printWindow: Window): Promise<number> {
  return new Promise((resolve) => {
    const images = Array.from(printWindow.document.images);

    if (images.length === 0) {
      resolve(0);
      return;
    }

    let settled = 0;

    function markDone() {
      settled += 1;
      if (settled >= images.length) {
        resolve(settled);
      }
    }

    for (const image of images) {
      if (image.complete) {
        markDone();
      } else {
        image.addEventListener("load", markDone, { once: true });
        image.addEventListener("error", markDone, { once: true });
      }
    }
  });
}

function waitForLayoutReady(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    const raf =
      typeof printWindow.requestAnimationFrame === "function"
        ? printWindow.requestAnimationFrame.bind(printWindow)
        : requestAnimationFrame;

    raf(() => {
      raf(() => resolve());
    });
  });
}

function logBadgePrintDiagnostics(payload: Record<string, unknown>) {
  console.info("[BADGE_PRINT]", payload);
}

export async function printThermalBadge(
  badge: ThermalBadgeData,
  options: BadgePrintOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const format = options.format ?? "thermal";
  const qrSizePx = format === "a4" ? 160 : 112;
  const qrDataUrl = badge.qr.payload
    ? await renderQrDataUrl(badge.qr.payload, qrSizePx)
    : null;

  if (badge.qr.payload && !qrDataUrl) {
    logBadgePrintDiagnostics({
      badgeId: badge.badgeNumber,
      visitId: badge.visitId,
      htmlLength: 0,
      qrPresent: false,
      printWindowCreated: false,
      imagesLoaded: 0,
      error: "qr_render_failed",
    });
    throw new Error("Could not render QR code for printing.");
  }

  const html = buildBadgePrintDocument({
    badge,
    photoUrl: options.photoUrl,
    format,
    qrDataUrl,
    origin: window.location.origin,
  });

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    logBadgePrintDiagnostics({
      badgeId: badge.badgeNumber,
      visitId: badge.visitId,
      htmlLength: html.length,
      qrPresent: Boolean(qrDataUrl),
      printWindowCreated: false,
      imagesLoaded: 0,
    });
    throw new Error("Unable to open print window");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = async () => {
    const imagesLoaded = await waitForImages(printWindow);
    await waitForLayoutReady(printWindow);

    const qrPresent = Boolean(
      printWindow.document.querySelector(".badge-print-qr img"),
    );

    logBadgePrintDiagnostics({
      badgeId: badge.badgeNumber,
      visitId: badge.visitId,
      htmlLength: html.length,
      qrPresent,
      printWindowCreated: true,
      imagesLoaded,
    });

    if (badge.qr.payload && !qrPresent) {
      printWindow.close();
      throw new Error("QR code missing from print document.");
    }

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      printWindow.addEventListener(
        "afterprint",
        () => {
          printWindow.close();
        },
        { once: true },
      );
    }, PRINT_READY_DELAY_MS);
  };

  if (printWindow.document.readyState === "complete") {
    await triggerPrint();
  } else {
    printWindow.addEventListener(
      "load",
      () => {
        void triggerPrint();
      },
      { once: true },
    );
  }
}
