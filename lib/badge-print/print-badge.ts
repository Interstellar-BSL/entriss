/**
 * Universal badge print engine — single pathway for kiosk, reception, visits, and approvals.
 *
 * Print entry-point audit (Phase 6.22):
 * | Component / workflow              | Trigger              | Engine              |
 * |-----------------------------------|----------------------|---------------------|
 * | kiosk-booking-badge.tsx           | onPrint              | printBadge (shared) |
 * | kiosk-inline-badge.tsx            | Print badge button   | printBadge (shared) |
 * | badge-preview-modal.tsx           | Print button         | printBadge (shared) |
 * | reception-console-shell.tsx       | → BadgePreviewModal  | printBadge (shared) |
 * | quick-register.tsx                | → BadgePreviewModal  | printBadge (shared) |
 * | qr-scanner-panel.tsx              | → BadgePreviewModal  | printBadge (shared) |
 * | visits-page.tsx                   | → BadgePreviewModal  | printBadge (shared) |
 * | visit-details-drawer.tsx          | → BadgePreviewModal  | printBadge (shared) |
 * | approvals / reception actions     | → BadgePreviewModal  | printBadge (shared) |
 *
 * No badge print path uses window.print() on the application document.
 * Analytics export (lib/analytics/export-utils.ts) is unrelated.
 */

import QRCode from "qrcode";

import { buildBadgePrintDocument } from "@/lib/badge-print/badge-print-html";
import { captureAndLogBadgePrintDom } from "@/lib/badge-print/badge-print-dom-inspection";
import type { BadgePrintFormat } from "@/lib/badge-print/badge-print-styles";
import type { ThermalBadgeData } from "@/lib/visits/types";

const PRINT_FRAME_ID = "entriss-badge-print-frame";
const PRINT_READY_DELAY_MS = 300;
const PRINT_FRAME_LOAD_TIMEOUT_MS = 10_000;
const FLOW_LOG = "[BADGE_PRINT_FLOW]";

const APP_SHELL_CONTAMINANT_SELECTORS = [
  "[data-app-sidebar]",
  "[data-app-main]",
  '[role="banner"]',
  "aside",
  "nav",
] as const;

export type BadgePrintSource =
  | "kiosk-inline"
  | "kiosk-booking"
  | "kiosk-badge-details"
  | "badge-preview-modal"
  | "unknown";

export interface PrintBadgeOptions {
  photoUrl?: string | null;
  format?: BadgePrintFormat;
  printSource?: BadgePrintSource;
}

interface PrintDocumentAudit {
  isolated: boolean;
  hasBadgeRoot: boolean;
  bodyChildCount: number;
  contaminantSelectors: string[];
  documentTitle: string;
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

function waitForImages(doc: Document): Promise<number> {
  return new Promise((resolve) => {
    const images = Array.from(doc.images);

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

function waitForLayoutReady(win: Window): Promise<void> {
  return new Promise((resolve) => {
    const raf =
      typeof win.requestAnimationFrame === "function"
        ? win.requestAnimationFrame.bind(win)
        : requestAnimationFrame;

    raf(() => {
      raf(() => resolve());
    });
  });
}

function removePrintFrame() {
  const existing = document.getElementById(PRINT_FRAME_ID);
  existing?.remove();
}

function createPrintFrame(): HTMLIFrameElement {
  removePrintFrame();

  const iframe = document.createElement("iframe");
  iframe.id = PRINT_FRAME_ID;
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Badge print");
  iframe.setAttribute("data-badge-print-frame", "true");
  // Off-screen with real dimensions so layout/print targets the iframe document,
  // not the application page (zero-size iframes can fall back to parent printing).
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "width:800px",
    "height:600px",
    "border:0",
    "margin:0",
    "padding:0",
    "opacity:0",
    "pointer-events:none",
    "overflow:hidden",
  ].join(";");
  document.body.appendChild(iframe);
  return iframe;
}

function waitForPrintFrameLoad(iframe: HTMLIFrameElement): Promise<Window> {
  return new Promise((resolve, reject) => {
    const printWindow = iframe.contentWindow;

    if (!printWindow) {
      reject(new Error("Unable to prepare print frame"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reject(new Error("Print frame load timeout"));
    }, PRINT_FRAME_LOAD_TIMEOUT_MS);

    function finish() {
      window.clearTimeout(timeoutId);
      const loadedWindow = iframe.contentWindow;
      if (!loadedWindow) {
        reject(new Error("Unable to prepare print frame"));
        return;
      }
      resolve(loadedWindow);
    }

    if (
      printWindow.document.readyState === "complete" &&
      printWindow.document.getElementById("badge-print-root")
    ) {
      finish();
      return;
    }

    iframe.addEventListener(
      "load",
      () => {
        finish();
      },
      { once: true },
    );
  });
}

function mountIsolatedPrintDocument(
  iframe: HTMLIFrameElement,
  html: string,
): Promise<Window> {
  iframe.removeAttribute("src");
  iframe.srcdoc = html;
  return waitForPrintFrameLoad(iframe);
}

function auditPrintDocument(doc: Document): PrintDocumentAudit {
  const badgeRoot = doc.getElementById("badge-print-root");
  const bodyChildren = doc.body ? Array.from(doc.body.children) : [];
  const contaminantSelectors = APP_SHELL_CONTAMINANT_SELECTORS.filter((selector) =>
    doc.querySelector(selector),
  );

  const isolated =
    Boolean(badgeRoot) &&
    bodyChildren.length === 1 &&
    bodyChildren[0]?.id === "badge-print-root" &&
    contaminantSelectors.length === 0;

  return {
    isolated,
    hasBadgeRoot: Boolean(badgeRoot),
    bodyChildCount: bodyChildren.length,
    contaminantSelectors: [...contaminantSelectors],
    documentTitle: doc.title,
  };
}

function readBadgeDimensions(root: HTMLElement | null) {
  if (!root) {
    return null;
  }

  const rect = root.getBoundingClientRect();
  return {
    widthPx: Math.round(rect.width),
    heightPx: Math.round(rect.height),
    format: root.getAttribute("data-format"),
  };
}

function logBadgePrintFlow(payload: Record<string, unknown>) {
  console.info(FLOW_LOG, payload);
}

function logBadgePrintDiagnostics(payload: Record<string, unknown>) {
  console.info("[BADGE_PRINT]", payload);
}

export async function printBadge(
  badge: ThermalBadgeData,
  options: PrintBadgeOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const format = options.format ?? "thermal";
  const printSource = options.printSource ?? "unknown";
  const badgeId = badge.badgeNumber || badge.visitId;

  logBadgePrintFlow({
    stage: "start",
    sourceComponent: printSource,
    badgeId,
    visitId: badge.visitId,
    printEngineInvoked: "printBadge",
    format,
  });

  const qrSizePx = format === "a4" ? 160 : 112;
  const qrDataUrl = badge.qr.payload
    ? await renderQrDataUrl(badge.qr.payload, qrSizePx)
    : null;

  if (badge.qr.payload && !qrDataUrl) {
    logBadgePrintFlow({
      stage: "error",
      sourceComponent: printSource,
      badgeId,
      printEngineInvoked: "printBadge",
      qrPresent: false,
      printDialogOpened: false,
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

  logBadgePrintFlow({
    stage: "html_generated",
    sourceComponent: printSource,
    badgeId,
    printEngineInvoked: "printBadge",
    htmlGenerated: true,
    htmlLength: html.length,
    qrPresent: Boolean(qrDataUrl),
  });

  const iframe = createPrintFrame();

  logBadgePrintFlow({
    stage: "iframe_created",
    sourceComponent: printSource,
    badgeId,
    printEngineInvoked: "printBadge",
    iframeCreated: true,
    iframeId: PRINT_FRAME_ID,
  });

  let printWindow: Window;

  try {
    printWindow = await mountIsolatedPrintDocument(iframe, html);
  } catch (error) {
    removePrintFrame();
    logBadgePrintFlow({
      stage: "error",
      sourceComponent: printSource,
      badgeId,
      printEngineInvoked: "printBadge",
      iframeCreated: true,
      printDialogOpened: false,
      error: error instanceof Error ? error.message : "print_frame_mount_failed",
    });
    throw error instanceof Error
      ? error
      : new Error("Unable to prepare print frame");
  }

  const doc = printWindow.document;
  const imagesLoaded = await waitForImages(doc);
  await waitForLayoutReady(printWindow);

  const root = doc.getElementById("badge-print-root");
  const audit = auditPrintDocument(doc);
  const qrPresent = Boolean(doc.querySelector(".badge-print-qr img"));
  const badgeDimensions = readBadgeDimensions(root);

  logBadgePrintFlow({
    stage: "document_ready",
    sourceComponent: printSource,
    badgeId,
    printEngineInvoked: "printBadge",
    iframeCreated: true,
    htmlGenerated: true,
    htmlLength: html.length,
    qrPresent,
    documentIsolated: audit.isolated,
    documentAudit: audit,
    badgeDimensions,
    imagesLoaded,
    printTarget: "iframe.contentWindow",
  });

  logBadgePrintDiagnostics({
    badgeId: badge.badgeNumber,
    visitId: badge.visitId,
    printSource,
    qrPresent,
    badgeDimensions,
    imagesLoaded,
    htmlLength: html.length,
    documentIsolated: audit.isolated,
  });

  if (!audit.isolated) {
    removePrintFrame();
    logBadgePrintFlow({
      stage: "error",
      sourceComponent: printSource,
      badgeId,
      printEngineInvoked: "printBadge",
      printDialogOpened: false,
      error: "print_document_not_isolated",
      documentAudit: audit,
    });
    throw new Error("Print document is not badge-isolated.");
  }

  if (badge.qr.payload && !qrPresent) {
    removePrintFrame();
    logBadgePrintFlow({
      stage: "error",
      sourceComponent: printSource,
      badgeId,
      printEngineInvoked: "printBadge",
      printDialogOpened: false,
      error: "qr_missing_from_print_document",
    });
    throw new Error("QR code missing from print document.");
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      const targetWindow = iframe.contentWindow;

      if (!targetWindow || targetWindow.document !== doc) {
        removePrintFrame();
        logBadgePrintFlow({
          stage: "error",
          sourceComponent: printSource,
          badgeId,
          printEngineInvoked: "printBadge",
          printDialogOpened: false,
          error: "print_target_lost",
        });
        resolve();
        return;
      }

      captureAndLogBadgePrintDom(doc, format, html.length);

      targetWindow.focus();
      targetWindow.print();

      logBadgePrintFlow({
        stage: "print_dialog_opened",
        sourceComponent: printSource,
        badgeId,
        printEngineInvoked: "printBadge",
        iframeCreated: true,
        htmlGenerated: true,
        htmlLength: html.length,
        qrPresent,
        printDialogOpened: true,
        printTarget: "iframe.contentWindow",
        documentIsolated: audit.isolated,
      });

      logBadgePrintDiagnostics({
        badgeId: badge.badgeNumber,
        visitId: badge.visitId,
        printSource,
        qrPresent,
        badgeDimensions,
        printDialogOpened: true,
        documentIsolated: audit.isolated,
      });

      targetWindow.addEventListener(
        "afterprint",
        () => {
          removePrintFrame();
        },
        { once: true },
      );

      window.setTimeout(() => {
        removePrintFrame();
      }, 60_000);

      resolve();
    }, PRINT_READY_DELAY_MS);
  });
}

/** @deprecated Use printBadge */
export const printThermalBadge = printBadge;
