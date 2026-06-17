import type { AnalyticsExportData } from "@/lib/api/analytics";

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","));
  }
  return lines.join("\n");
}

export function buildVisitsCsv(data: AnalyticsExportData) {
  return rowsToCsv(
    [
      "visitId",
      "visitorId",
      "branchName",
      "hostName",
      "status",
      "scheduledAt",
      "checkedInAt",
      "checkedOutAt",
      "createdAt",
    ],
    data.visits.map((visit) => [
      visit.visitId,
      visit.visitorId,
      visit.branchName,
      visit.hostName,
      visit.status,
      visit.scheduledAt,
      visit.checkedInAt,
      visit.checkedOutAt,
      visit.createdAt,
    ]),
  );
}

export function buildBranchSummaryCsv(data: AnalyticsExportData) {
  return rowsToCsv(
    [
      "branchName",
      "totalVisits",
      "checkIns",
      "completedVisits",
      "completionRate",
      "firstTimeVisitors",
      "returningVisitors",
    ],
    data.branches.branches.map((branch) => [
      branch.branchName,
      branch.totalVisits,
      branch.checkIns,
      branch.completedVisits,
      branch.completionRate,
      branch.firstTimeVisitors,
      branch.returningVisitors,
    ]),
  );
}

export function buildHostSummaryCsv(data: AnalyticsExportData) {
  return rowsToCsv(
    [
      "hostName",
      "totalVisits",
      "completedVisits",
      "pendingVisits",
      "checkedInVisits",
      "averageDurationMinutes",
    ],
    data.hosts.hosts.map((host) => [
      host.hostName,
      host.totalVisits,
      host.completedVisits,
      host.pendingVisits,
      host.checkedInVisits,
      host.averageDurationMinutes,
    ]),
  );
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadExcelWorkbook(
  data: AnalyticsExportData,
  filename: string,
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const overviewSheet = XLSX.utils.aoa_to_sheet([
    ["Metric", "Value"],
    ["Range", data.range.label],
    ["From", data.range.from],
    ["To", data.range.to],
    ["Daily visits", data.overview.kpis.daily],
    ["Weekly visits", data.overview.kpis.weekly],
    ["Monthly visits", data.overview.kpis.monthly],
    ["Total in range", data.overview.kpis.totalInRange],
    ["Checked in", data.overview.kpis.checkedIn],
    ["Completed", data.overview.kpis.completed],
    ["Cancelled", data.overview.kpis.cancelled],
    ["No-shows", data.overview.kpis.noShows],
  ]);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

  const branchSheet = XLSX.utils.json_to_sheet(data.branches.branches);
  XLSX.utils.book_append_sheet(workbook, branchSheet, "Branch Analytics");

  const hostSheet = XLSX.utils.json_to_sheet(data.hosts.hosts);
  XLSX.utils.book_append_sheet(workbook, hostSheet, "Host Analytics");

  const visitsSheet = XLSX.utils.json_to_sheet(data.visits);
  XLSX.utils.book_append_sheet(workbook, visitsSheet, "Visits");

  const trendSheet = XLSX.utils.json_to_sheet(data.overview.trend);
  XLSX.utils.book_append_sheet(workbook, trendSheet, "Daily Trend");

  XLSX.writeFile(workbook, filename);
}

export function openPrintablePdfReport(data: AnalyticsExportData) {
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Entriss Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #18181b; }
          h1, h2 { margin: 0 0 8px; }
          p, li { font-size: 12px; line-height: 1.5; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; }
          .value { font-size: 20px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
          th, td { border: 1px solid #e4e4e7; padding: 6px 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Analytics Report</h1>
        <p>${data.range.label} · ${new Date(data.range.from).toLocaleDateString()} to ${new Date(data.range.to).toLocaleDateString()}</p>
        <div class="grid">
          <div class="card"><div class="value">${data.overview.kpis.totalInRange}</div><div>Total visits</div></div>
          <div class="card"><div class="value">${data.overview.kpis.completed}</div><div>Completed</div></div>
          <div class="card"><div class="value">${data.overview.kpis.checkedIn}</div><div>Checked in</div></div>
          <div class="card"><div class="value">${data.overview.kpis.noShows}</div><div>No-shows</div></div>
        </div>
        <h2>Key insights</h2>
        <ul>
          <li>Top branch: ${data.branches.branches[0]?.branchName ?? "—"} (${data.branches.branches[0]?.totalVisits ?? 0} visits)</li>
          <li>Top host: ${data.hosts.hosts[0]?.hostName ?? "—"} (${data.hosts.hosts[0]?.totalVisits ?? 0} visits)</li>
          <li>Force overrides: ${data.audit.overrideUsage.reduce((sum, row) => sum + row.count, 0)}</li>
          <li>Compliance issues: ${data.audit.missingCheckouts.length + data.audit.approvalDelays.length}</li>
        </ul>
        <h2>Branch summary</h2>
        <table>
          <thead><tr><th>Branch</th><th>Visits</th><th>Completion %</th></tr></thead>
          <tbody>
            ${data.branches.branches
              .slice(0, 10)
              .map(
                (branch) =>
                  `<tr><td>${branch.branchName}</td><td>${branch.totalVisits}</td><td>${branch.completionRate}%</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    return;
  }

  const printWhenReady = () => {
    printWindow.focus();
    printWindow.print();
    URL.revokeObjectURL(url);
  };

  if (printWindow.document.readyState === "complete") {
    printWhenReady();
  } else {
    printWindow.addEventListener("load", printWhenReady, { once: true });
  }
}
