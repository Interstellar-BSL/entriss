"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchKioskOperationalSnapshot,
  getOperationalForBranch,
  getTimezoneForBranch,
  isKioskGloballyEnabled,
  isWalkInAllowedOnHome,
  type KioskOperationalSnapshot,
} from "@/lib/kiosk/operational-policy";
import { DEFAULT_BRANCH_OPERATIONAL_SETTINGS } from "@/lib/settings/branch-operational";
import { DEFAULT_BRANCH_TIMEZONE } from "@/lib/settings/branch-timezones";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";
import type { BrandingConfig } from "@/lib/settings/types";

const defaultBranding: BrandingConfig = {
  logoUrl: null,
  primaryColor: DEFAULT_ORGANIZATION_SETTINGS.primaryColor,
  secondaryColor: DEFAULT_ORGANIZATION_SETTINGS.secondaryColor,
  welcomeMessage: DEFAULT_ORGANIZATION_SETTINGS.welcomeMessage,
  themeMode: DEFAULT_ORGANIZATION_SETTINGS.themeMode,
};

interface KioskOperationalContextValue {
  ready: boolean;
  snapshot: KioskOperationalSnapshot;
  kioskEnabled: boolean;
  allowWalkIns: boolean;
  branding: KioskOperationalSnapshot["branding"];
  qrCheckInEnabled: boolean;
  getForBranch: (branchId: string | null | undefined) => KioskOperationalSnapshot["defaultOperational"];
  getTimezoneForBranch: (branchId: string | null | undefined) => string;
}

const defaultSnapshot: KioskOperationalSnapshot = {
  byBranchId: {},
  timezoneByBranchId: {},
  defaultOperational: DEFAULT_BRANCH_OPERATIONAL_SETTINGS,
  defaultTimezone: DEFAULT_BRANCH_TIMEZONE,
  branding: defaultBranding,
  qrCheckInEnabled: DEFAULT_ORGANIZATION_SETTINGS.qrRequired,
};

const KioskOperationalContext = createContext<KioskOperationalContextValue>({
  ready: false,
  snapshot: defaultSnapshot,
  kioskEnabled: true,
  allowWalkIns: true,
  branding: defaultBranding,
  qrCheckInEnabled: DEFAULT_ORGANIZATION_SETTINGS.qrRequired,
  getForBranch: () => DEFAULT_BRANCH_OPERATIONAL_SETTINGS,
  getTimezoneForBranch: () => DEFAULT_BRANCH_TIMEZONE,
});

export function KioskOperationalProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] =
    useState<KioskOperationalSnapshot>(defaultSnapshot);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded = await fetchKioskOperationalSnapshot();
        if (!cancelled) {
          setSnapshot(loaded);
        }
      } catch {
        if (!cancelled) {
          setSnapshot(defaultSnapshot);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<KioskOperationalContextValue>(
    () => ({
      ready,
      snapshot,
      kioskEnabled: isKioskGloballyEnabled(snapshot),
      allowWalkIns: isWalkInAllowedOnHome(snapshot),
      branding: snapshot.branding,
      qrCheckInEnabled: snapshot.qrCheckInEnabled,
      getForBranch: (branchId) => getOperationalForBranch(snapshot, branchId),
      getTimezoneForBranch: (branchId) => getTimezoneForBranch(snapshot, branchId),
    }),
    [ready, snapshot],
  );

  return (
    <KioskOperationalContext.Provider value={value}>
      {children}
    </KioskOperationalContext.Provider>
  );
}

export function useKioskOperational() {
  return useContext(KioskOperationalContext);
}
