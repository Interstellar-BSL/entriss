"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

interface GlobalLoadingContextValue {
  pending: number;
  active: boolean;
  trackAsync: <T>(operation: () => Promise<T>) => Promise<T>;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue>({
  pending: 0,
  active: false,
  trackAsync: async (operation) => operation(),
});

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [pending, setPending] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const previousPathRef = useRef(pathname);

  const trackAsync = useCallback(async <T,>(operation: () => Promise<T>) => {
    setPending((count) => count + 1);
    try {
      return await operation();
    } finally {
      setPending((count) => Math.max(0, count - 1));
    }
  }, []);

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;
    setNavigating(true);

    const timer = window.setTimeout(() => {
      setNavigating(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const sessionBootstrapping = status === "loading";
  const active = pending > 0 || navigating || sessionBootstrapping;

  const value = useMemo(
    () => ({ pending, active, trackAsync }),
    [pending, active, trackAsync],
  );

  return (
    <GlobalLoadingContext.Provider value={value}>
      <GlobalLoadingBar active={active} />
      {children}
    </GlobalLoadingContext.Provider>
  );
}

function GlobalLoadingBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cn(
          "h-full w-1/3 bg-[var(--brand-primary)]",
          active && "animate-[global-loading-slide_1.1s_ease-in-out_infinite]",
        )}
      />
    </div>
  );
}

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext);
}
