export type BadgePrintFormat = "thermal" | "a4";

/** @deprecated Print no longer forces a paper size — browser/printer chooses. */
export function badgePrintPageSize(_format: BadgePrintFormat): string {
  return "auto";
}

/**
 * Centralized badge print stylesheet — used by all print entry points.
 *
 * Pagination rules (Phase 6.24):
 * - No custom @page paper size (thermal/A4) — avoids blank sheets on mismatched printers.
 * - No transform scaling — avoids phantom pages from scaled layout boxes.
 * - break-inside only on #badge-print-root — children must not be separate print regions.
 */
export function getBadgePrintStyles(format: BadgePrintFormat): string {
  const badgeWidth = format === "a4" ? "90mm" : "58mm";
  const qrMaxSize = format === "a4" ? "42mm" : "28mm";

  return `
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: auto;
      background: #ffffff;
      color: #18181b;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      margin: 5mm;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    #badge-print-root {
      margin: 0 auto;
      padding: ${format === "a4" ? "4mm" : "2mm"};
      width: ${badgeWidth};
      max-width: calc(100% - 10mm);
      transform: none;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .badge-print-view {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: ${format === "a4" ? "5mm" : "2mm"};
      width: 100%;
    }
    .badge-print-header {
      text-align: center;
      flex-shrink: 0;
    }
    .badge-print-logo {
      display: block;
      margin: 0 auto 2mm;
      max-width: 100%;
      max-height: ${format === "a4" ? "16mm" : "10mm"};
      object-fit: contain;
    }
    .badge-print-org {
      margin: 0;
      font-size: ${format === "a4" ? "11pt" : "7pt"};
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #52525b;
    }
    .badge-print-photo {
      display: block;
      margin: 0 auto;
      width: ${format === "a4" ? "28mm" : "18mm"};
      height: ${format === "a4" ? "28mm" : "18mm"};
      border-radius: 9999px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .badge-print-fields {
      margin: 0;
      display: grid;
      gap: ${format === "a4" ? "2.5mm" : "1.5mm"};
      flex-shrink: 1;
      min-height: 0;
    }
    .badge-print-field {
      display: grid;
      gap: 0.5mm;
    }
    .badge-print-field dt {
      margin: 0;
      font-size: ${format === "a4" ? "8pt" : "6pt"};
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #a1a1aa;
    }
    .badge-print-field dd {
      margin: 0;
      line-height: 1.25;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .badge-print-codes {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${format === "a4" ? "3mm" : "2mm"};
      margin-top: auto;
      width: 100%;
      flex-shrink: 0;
    }
    .badge-print-qr {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      max-width: ${qrMaxSize};
    }
    .badge-print-qr img {
      display: block;
      width: 100%;
      height: auto;
      max-width: ${qrMaxSize};
      max-height: ${qrMaxSize};
      object-fit: contain;
    }
    .badge-print-meta {
      margin: 0;
      text-align: center;
      font-size: ${format === "a4" ? "8pt" : "6pt"};
      color: #a1a1aa;
      flex-shrink: 0;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        width: 100% !important;
        overflow: visible !important;
      }
      body {
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
      }
      body > :not(#badge-print-root) {
        display: none !important;
      }
      #badge-print-root {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        page-break-before: avoid !important;
        page-break-after: avoid !important;
        break-before: avoid !important;
        break-after: avoid !important;
        transform: none !important;
        max-width: calc(100% - 10mm) !important;
      }
      .badge-print-qr img {
        max-width: ${qrMaxSize} !important;
        max-height: ${qrMaxSize} !important;
      }
    }
  `;
}
