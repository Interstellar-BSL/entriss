import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const skipPathParts = [
  "\\kiosk\\",
  "/kiosk/",
  "\\node_modules\\",
  "\\.next\\",
  "badge-print",
  "email.renderer",
  "platform-email",
  "approval-email",
  "invite-email",
  "export-utils",
];

const replacements = [
  ["bg-zinc-50/80", "bg-[var(--surface-muted)]"],
  ["bg-zinc-50/50", "bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-50/80", "hover:bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-50", "hover:bg-[var(--surface-muted)]"],
  ["hover:bg-zinc-100", "hover:bg-[var(--surface-muted)]"],
  ["bg-zinc-50", "bg-[var(--surface-muted)]"],
  ["bg-zinc-100", "bg-[var(--surface-muted)]"],
  ["bg-zinc-200", "bg-[var(--surface-muted)]"],
  ["bg-white", "bg-[var(--card)]"],
  ["text-zinc-900", "text-[var(--foreground)]"],
  ["text-zinc-800", "text-[var(--foreground)]"],
  ["text-zinc-700", "text-[var(--foreground)]"],
  ["text-zinc-600", "text-[var(--muted)]"],
  ["text-zinc-500", "text-[var(--muted)]"],
  ["text-zinc-400", "text-[var(--muted)]"],
  ["border-zinc-200", "border-[var(--border)]"],
  ["border-zinc-100", "border-[var(--border)]"],
  ["divide-zinc-100", "divide-[var(--border)]"],
  ["divide-zinc-50", "divide-[var(--border)]"],
  ["ring-zinc-200", "ring-[var(--border)]"],
  ["ring-zinc-400", "ring-[var(--ring)]"],
  ["focus-visible:ring-zinc-400", "focus-visible:ring-[var(--ring)]"],
  ["focus-visible:outline-zinc-400", "focus-visible:outline-[var(--ring)]"],
  ["hover:text-zinc-900", "hover:text-[var(--foreground)]"],
  ["hover:text-zinc-700", "hover:text-[var(--foreground)]"],
  ["text-blue-700", "text-[var(--link)]"],
  ["text-blue-600", "text-[var(--link)]"],
  ["font-medium text-zinc-900", "font-medium text-[var(--foreground)]"],
  ["border-zinc-300", "border-[var(--border)]"],
  ["border-t-zinc-600", "border-t-[var(--foreground)]"],
  ["border-zinc-300", "border-[var(--border)]"],
  ["bg-zinc-900", "bg-[var(--brand-primary)]"],
  ["text-white", "text-[var(--card)]"],
];

function shouldSkip(filePath) {
  const normalized = filePath.replaceAll("/", "\\");
  return skipPathParts.some((part) => normalized.includes(part));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (shouldSkip(fullPath)) {
      continue;
    }
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(tsx|ts|css)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const targets = [
  join(root, "components"),
  join(root, "app"),
].flatMap((dir) => walk(dir));

let changedFiles = 0;

for (const file of targets) {
  if (shouldSkip(file)) {
    continue;
  }

  const original = readFileSync(file, "utf8");
  let next = original;

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  if (next !== original) {
    writeFileSync(file, next, "utf8");
    changedFiles += 1;
  }
}

console.log(`Updated ${changedFiles} files.`);
