import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const lines = fs
  .readFileSync(
    path.join(
      process.env.USERPROFILE ?? "",
      ".cursor/projects/c-Users-SamuelAdebanji-Downloads-Personal-entriss/agent-transcripts/f68add4b-22a3-41d4-9b44-56ee48fca505/f68add4b-22a3-41d4-9b44-56ee48fca505.jsonl",
    ),
    "utf8",
  )
  .split("\n");

const NEW_FILES = [
  "components/dashboard/dashboard-kpi-strip.tsx",
  "components/dashboard/dashboard-fast-actions.tsx",
  "components/dashboard/dashboard-activity-feed.tsx",
  "components/dashboard/duplicate-alerts-panel.tsx",
  "components/dashboard/operational-dashboard.tsx",
  "components/admin/admin-platform-dashboard.tsx",
  "components/hosts/hosts-management-page.tsx",
  "components/hosts/host-detail-drawer.tsx",
  "components/kiosk/kiosk-search-entry.tsx",
  "app/(app)/hosts/page.tsx",
];

const RESTORE_WRITES = {
  "app/(app)/page.tsx": `import { Suspense } from "react";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
`,
  "app/(app)/dashboard/page.tsx": `import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/");
}
`,
  "app/(admin)/admin/dashboard/page.tsx": `import { AdminDashboardStats } from "@/components/admin/admin-dashboard-stats";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Platform dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of tenant organizations and onboarding requests.
        </p>
      </div>
      <AdminDashboardStats />
    </div>
  );
}
`,
};

function norm(filePath) {
  return filePath
    .replace(/\\\\/g, "/")
    .replace(/^C:\/Users\/SamuelAdebanji\/Downloads\/Personal\/entriss\//i, "")
    .replace(/\\/g, "/");
}

const fileOps = new Map();
for (let i = 1418; i < 1472; i++) {
  const line = lines[i];
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    for (const block of obj.message?.content ?? []) {
      if (block.type !== "tool_use" || block.name !== "StrReplace") continue;
      const rel = norm(block.input.path);
      if (!fileOps.has(rel)) fileOps.set(rel, []);
      fileOps.get(rel).push({ old: block.input.old_string, neu: block.input.new_string });
    }
  } catch {
    // ignore malformed lines
  }
}

const MODIFIED_FILES = [
  "components/reception/reception-command-center.tsx",
  "components/reception/reception-console-shell.tsx",
  "lib/rbac/navigation.ts",
  "components/layout/sidebar.tsx",
  "components/admin/admin-dashboard-stats.tsx",
  "components/kiosk/kiosk-shell.tsx",
  "components/kiosk/kiosk-booking-flow.tsx",
  "components/visits/new-visit-form.tsx",
  "components/visits/new-visit-page.tsx",
];

const failures = [];
for (const rel of MODIFIED_FILES) {
  const ops = fileOps.get(rel);
  if (!ops?.length) {
    failures.push(`NO OPS ${rel}`);
    continue;
  }

  const full = path.join(ROOT, rel);
  let content = fs.readFileSync(full, "utf8");
  for (const op of [...ops].reverse()) {
    if (!content.includes(op.neu)) {
      failures.push(`MISSING NEW in ${rel} (len=${op.neu.length})`);
      continue;
    }
    content = content.replace(op.neu, op.old);
  }
  fs.writeFileSync(full, content);
}

for (const [rel, content] of Object.entries(RESTORE_WRITES)) {
  fs.writeFileSync(path.join(ROOT, rel), content);
}

for (const rel of NEW_FILES) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

const hostsDir = path.join(ROOT, "app/(app)/hosts");
if (fs.existsSync(hostsDir)) {
  try {
    fs.rmdirSync(hostsDir);
  } catch {
    // directory may not be empty on some systems
  }
}

const hostsComponentsDir = path.join(ROOT, "components/hosts");
if (fs.existsSync(hostsComponentsDir)) {
  const remaining = fs.readdirSync(hostsComponentsDir);
  if (remaining.length === 0) {
    fs.rmdirSync(hostsComponentsDir);
  }
}

console.log("Revert done");
console.log(failures.length ? failures.join("\n") : "No StrReplace failures");
