"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyOrgBrandingToDocument,
  clearOrgBrandingFromDocument,
  getDefaultOrgBranding,
  resolveOrgBranding,
  type ResolvedOrgBranding,
} from "@/lib/branding";
import { getOrganizationSettings } from "@/lib/api/settings";

interface OrgBrandingContextValue {
  branding: ResolvedOrgBranding;
  ready: boolean;
  refresh: () => Promise<void>;
}

const OrgBrandingContext = createContext<OrgBrandingContextValue>({
  branding: getDefaultOrgBranding(),
  ready: false,
  refresh: async () => {},
});

export function OrgBrandingProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const organizationId = session?.user?.organizationId ?? null;
  const organizationName = session?.user?.organizationName ?? null;
  const [branding, setBranding] = useState<ResolvedOrgBranding>(() =>
    getDefaultOrgBranding({ organizationId, organizationName }),
  );
  const [ready, setReady] = useState(false);

  const loadBranding = useMemo(
    () => async () => {
      if (!organizationId || status !== "authenticated") {
        const fallback = getDefaultOrgBranding({ organizationId, organizationName });
        setBranding(fallback);
        clearOrgBrandingFromDocument();
        setReady(true);
        return;
      }

      try {
        const response = await getOrganizationSettings();
        if (response.config.organizationId !== organizationId) {
          return;
        }

        const resolved = resolveOrgBranding(response.config.branding, {
          organizationId,
          organizationName,
        });
        setBranding(resolved);
        applyOrgBrandingToDocument(resolved);
      } catch {
        const fallback = resolveOrgBranding(null, {
          organizationId,
          organizationName,
        });
        setBranding(fallback);
        applyOrgBrandingToDocument(fallback);
      } finally {
        setReady(true);
      }
    },
    [organizationId, organizationName, status],
  );

  useEffect(() => {
    setReady(false);
    void loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    return () => {
      clearOrgBrandingFromDocument();
    };
  }, []);

  const value = useMemo(
    () => ({
      branding,
      ready,
      refresh: loadBranding,
    }),
    [branding, ready, loadBranding],
  );

  return (
    <OrgBrandingContext.Provider value={value}>
      {children}
    </OrgBrandingContext.Provider>
  );
}

export function useOrgBranding() {
  return useContext(OrgBrandingContext);
}
