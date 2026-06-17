import type { BadgePrintFormat } from "@/lib/kiosk/badge-print-styles";
import { getBadgePrintStyles } from "@/lib/kiosk/badge-print-styles";
import type { ThermalBadgeData } from "@/lib/visits/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAssetUrl(url: string, origin: string): string {
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  try {
    return new URL(url, origin).href;
  } catch {
    return url;
  }
}

function fontSizeCss(size?: "sm" | "md" | "lg"): string {
  switch (size) {
    case "lg":
      return "11pt";
    case "sm":
      return "6pt";
    default:
      return "8pt";
  }
}

function formatFieldValue(key: string, value: string): string {
  if (key === "checkInTime" && value !== "—") {
    try {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  return value;
}

export interface BadgePrintHtmlInput {
  badge: ThermalBadgeData;
  photoUrl?: string | null;
  format?: BadgePrintFormat;
  qrDataUrl?: string | null;
  origin: string;
}

/**
 * Builds a self-contained HTML document for badge printing.
 * Mirrors on-screen {@link ThermalBadgePreview} layout (QR-only, no barcode).
 */
export function buildBadgePrintDocument(input: BadgePrintHtmlInput): string {
  const format = input.format ?? "thermal";
  const { badge } = input;
  const displayPhoto = input.photoUrl ?? badge.visitor.photoUrl;
  const styles = getBadgePrintStyles(format);
  const qrSizePx = format === "a4" ? 160 : 112;

  const headerHtml = badge.organization.logoUrl
    ? `<img src="${escapeHtml(resolveAssetUrl(badge.organization.logoUrl, input.origin))}" alt="" class="badge-print-logo" />`
    : `<p class="badge-print-org">${escapeHtml(badge.organization.name)}</p>`;

  const photoHtml = displayPhoto
    ? `<img src="${escapeHtml(resolveAssetUrl(displayPhoto, input.origin))}" alt="" class="badge-print-photo" />`
    : "";

  const fieldsHtml = badge.layout.fields
    .map((field) => {
      const value = formatFieldValue(field.key, field.value);
      const weight = field.bold ? "font-weight:700;color:#18181b;" : "color:#3f3f46;";
      return `<div class="badge-print-field">
        <dt>${escapeHtml(field.label)}</dt>
        <dd style="font-size:${fontSizeCss(field.fontSize)};${weight}">${escapeHtml(value)}</dd>
      </div>`;
    })
    .join("");

  const qrHtml = input.qrDataUrl
    ? `<div class="badge-print-qr">
        <img
          src="${input.qrDataUrl}"
          alt="Visit QR code"
          width="${qrSizePx}"
          height="${qrSizePx}"
        />
      </div>`
    : "";

  const metaLabel =
    format === "a4"
      ? `A4 · ${badge.badgeNumber}`
      : `Thermal · ${badge.layout.widthMm}×${badge.layout.heightMm} mm`;

  const body = `<div id="badge-print-root" class="badge-print-view" data-format="${format}">
    <header class="badge-print-header">${headerHtml}</header>
    ${photoHtml}
    <dl class="badge-print-fields">${fieldsHtml}</dl>
    <div class="badge-print-codes">${qrHtml}</div>
    <p class="badge-print-meta">${escapeHtml(metaLabel)}</p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Visitor badge</title>
    <style>${styles}</style>
  </head>
  <body>${body}</body>
</html>`;
}
