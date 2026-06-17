export type BadgePrintFormat = "thermal" | "a4";

export function badgePrintPageSize(format: BadgePrintFormat): string {
  return format === "a4" ? "A4 portrait" : "62mm 100mm";
}

export function getBadgePrintStyles(format: BadgePrintFormat): string {
  const pageSize = badgePrintPageSize(format);
  const surfaceWidth = format === "a4" ? "190mm" : "58mm";
  const surfaceMinHeight = format === "a4" ? "auto" : "96mm";

  return `
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #18181b;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: visible !important;
    }
    @page {
      size: ${pageSize};
      margin: ${format === "a4" ? "10mm" : "0"};
    }
    #badge-print-root {
      margin: 0 auto;
      padding: ${format === "a4" ? "0" : "2mm"};
      width: ${surfaceWidth};
      min-height: ${surfaceMinHeight};
      overflow: visible !important;
      transform: none !important;
      clip-path: none !important;
    }
    .badge-print-view {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: ${format === "a4" ? "6mm" : "2mm"};
      width: 100%;
      overflow: visible !important;
      transform: none !important;
      clip-path: none !important;
    }
    .badge-print-header {
      text-align: center;
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
    }
    .badge-print-fields {
      margin: 0;
      display: grid;
      gap: ${format === "a4" ? "2.5mm" : "1.5mm"};
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
    }
    .badge-print-codes {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${format === "a4" ? "4mm" : "2mm"};
      margin-top: auto;
      width: 100%;
      overflow: visible !important;
    }
    .badge-print-qr {
      display: flex;
      justify-content: center;
      align-items: center;
      width: auto;
      height: auto;
      overflow: visible !important;
      page-break-inside: avoid;
    }
    .badge-print-qr img {
      display: block;
      width: auto !important;
      height: auto !important;
      max-width: none !important;
      object-fit: contain;
      overflow: visible !important;
      page-break-inside: avoid;
    }
    .badge-print-meta {
      margin: 0;
      text-align: center;
      font-size: ${format === "a4" ? "8pt" : "6pt"};
      color: #a1a1aa;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        height: auto !important;
      }
      #badge-print-root,
      .badge-print-view,
      .badge-print-codes,
      .badge-print-qr,
      .badge-print-qr img {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        overflow: visible !important;
        transform: none !important;
        clip-path: none !important;
      }
      .badge-print-qr img {
        width: auto !important;
        height: auto !important;
        max-width: none !important;
      }
    }
  `;
}
