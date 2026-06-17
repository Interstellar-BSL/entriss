export function slugifyBranchName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return slug.length > 0 ? slug : "branch";
}

export function normalizeBranchCode(code: string): string {
  return code.trim().toUpperCase();
}
