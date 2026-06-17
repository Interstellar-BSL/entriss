const STORAGE_KEY = "entriss:host-departments";

type DepartmentStore = Record<string, Record<string, string>>;

function readStore(): DepartmentStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as DepartmentStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: DepartmentStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getHostDepartment(
  organizationId: string,
  memberId: string,
): string {
  const store = readStore();
  return store[organizationId]?.[memberId] ?? "";
}

export function getHostDepartmentsForOrg(
  organizationId: string,
): Record<string, string> {
  const store = readStore();
  return store[organizationId] ?? {};
}

export function setHostDepartment(
  organizationId: string,
  memberId: string,
  department: string,
) {
  const store = readStore();
  const trimmed = department.trim();
  const orgDepartments = { ...(store[organizationId] ?? {}) };

  if (trimmed) {
    orgDepartments[memberId] = trimmed;
  } else {
    delete orgDepartments[memberId];
  }

  writeStore({
    ...store,
    [organizationId]: orgDepartments,
  });
}

export function formatHostDepartment(department: string | undefined | null) {
  const trimmed = department?.trim();
  return trimmed ? trimmed : "—";
}
