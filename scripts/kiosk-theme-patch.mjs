import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "components", "kiosk");

const skipFiles = new Set([
  "kiosk-qr-debug-panel.tsx",
  "kiosk-inline-badge.tsx",
  "kiosk-badge-panel.tsx",
  "kiosk-badge-details-panel.tsx",
  "kiosk-booking-badge.tsx",
]);

const replacements = [
  ["from-zinc-50/80 to-white", "from-[var(--surface-muted)]/80 to-[var(--card)]"],
  ["from-zinc-50/50 to-white", "from-[var(--surface-muted)]/50 to-[var(--card)]"],
  ["bg-zinc-50/80", "bg-[var(--surface-muted)]"],
  ["bg-zinc-50/50", "bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-50/80", "hover:bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-50", "hover:bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-100", "hover:bg-[var(--surface-muted)]"],
  ["active:bg-zinc-50", "active:bg-[var(--surface-muted)]"],
  ["bg-zinc-50", "bg-[var(--surface-muted)]"],
  ["bg-zinc-100", "bg-[var(--surface-muted)]"],
  ["bg-zinc-200", "bg-[var(--surface-muted)]"],
  ["bg-zinc-700", "bg-[var(--muted)]"],
  ["bg-zinc-800", "bg-[var(--foreground)]"],
  ["bg-zinc-900", "bg-[var(--foreground)]"],
  ["bg-zinc-950", "bg-[var(--foreground)]"],
  ["bg-zinc-950/92", "bg-[var(--foreground)]/92"],
  ["bg-white/95", "bg-[var(--card)]/95"],
  ["bg-white/90", "bg-[var(--card)]/90"],
  ["bg-white/70", "bg-[var(--card)]/70"],
  ["bg-white/20", "bg-[var(--on-brand)]/20"],
  ["bg-white/15", "bg-[var(--on-brand)]/15"],
  ["bg-white/10", "bg-[var(--on-brand)]/10"],
  ["bg-white/5", "bg-[var(--on-brand)]/5"],
  ["hover:bg-white/10", "hover:bg-[var(--on-brand)]/10"],
  ["border-white/70", "border-[var(--on-brand)]/70"],
  ["bg-white", "bg-[var(--card)]"],
  ["text-zinc-900", "text-[var(--foreground)]"],
  ["text-zinc-800", "text-[var(--foreground)]"],
  ["text-zinc-700", "text-[var(--foreground)]"],
  ["text-zinc-600", "text-[var(--muted)]"],
  ["text-zinc-500", "text-[var(--muted)]"],
  ["text-zinc-400", "text-[var(--muted)]"],
  ["text-zinc-300", "text-[var(--card)]"],
  ["text-zinc-200", "text-[var(--card)]"],
  ["border-zinc-200", "border-[var(--border)]"],
  ["border-zinc-100", "border-[var(--border)]"],
  ["border-zinc-300", "border-[var(--border)]"],
  ["border-zinc-600", "border-[var(--border)]"],
  ["border-zinc-700", "border-[var(--border)]"],
  ["border-zinc-700/80", "border-[var(--border)]/80"],
  ["border-t border-zinc-100", "border-t border-[var(--border)]"],
  ["divide-zinc-100", "divide-[var(--border)]"],
  ["ring-zinc-200", "ring-[var(--border)]"],
  ["ring-4 ring-zinc-200", "ring-4 ring-[var(--border)]"],
  ["focus-visible:outline-zinc-400", "focus-visible:outline-[var(--ring)]"],
  ["hover:border-zinc-300", "hover:border-[var(--border)]"],
  ["active:border-zinc-300", "active:border-[var(--border)]"],
  ["group-hover:text-zinc-600", "group-hover:text-[var(--foreground)]"],
  ["hover:text-zinc-200", "hover:text-[var(--card)]"],
  ["hover:bg-zinc-800", "hover:bg-[var(--foreground)]"],
  ["border-zinc-900 bg-zinc-900 text-white", "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--on-brand)]"],
  ["bg-zinc-900 text-white", "bg-[var(--brand-primary)] text-[var(--on-brand)]"],
  ["text-white", "text-[var(--on-brand)]"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(tsx|ts)$/.test(entry) && !skipFiles.has(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

let updated = 0;

for (const filePath of walk(root)) {
  let content = readFileSync(filePath, "utf8");
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    writeFileSync(filePath, content, "utf8");
    updated += 1;
    console.log("updated:", filePath.replace(process.cwd(), ""));
  }
}

console.log(`\nDone. Updated ${updated} files.`);
