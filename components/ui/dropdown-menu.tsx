"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

interface MenuPosition {
  top: number;
  left: number;
}

const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;

function computeMenuPosition(
  anchor: HTMLElement,
  menuWidth: number,
  menuHeight: number,
): MenuPosition {
  const rect = anchor.getBoundingClientRect();

  const left = Math.min(
    Math.max(rect.right - menuWidth, VIEWPORT_PADDING),
    window.innerWidth - menuWidth - VIEWPORT_PADDING,
  );

  const belowTop = rect.bottom + MENU_GAP;
  const aboveTop = rect.top - menuHeight - MENU_GAP;
  const fitsBelow =
    belowTop + menuHeight <= window.innerHeight - VIEWPORT_PADDING;
  const fitsAbove = aboveTop >= VIEWPORT_PADDING;

  let top: number;
  if (fitsBelow) {
    top = belowTop;
  } else if (fitsAbove) {
    top = aboveTop;
  } else {
    top = Math.max(
      VIEWPORT_PADDING,
      Math.min(
        belowTop,
        window.innerHeight - menuHeight - VIEWPORT_PADDING,
      ),
    );
  }

  return { top, left };
}

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  menuClassName,
  menuWidth = 176,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  menuClassName?: string;
  menuWidth?: number;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) {
      return;
    }

    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    setPosition(
      computeMenuPosition(anchorRef.current, menuWidth, menuHeight),
    );
  }, [menuWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    if (!anchorRef.current || !menuRef.current) {
      return;
    }

    setPosition(
      computeMenuPosition(
        anchorRef.current,
        menuWidth,
        menuRef.current.offsetHeight,
      ),
    );
  }, [open, menuWidth, children]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, onOpenChange, updatePosition]);

  const menu =
    open && portalTarget ? (
      <div
        ref={menuRef}
        role="menu"
        style={
          position
            ? {
                position: "fixed",
                top: position.top,
                left: position.left,
                width: menuWidth,
              }
            : {
                position: "fixed",
                top: -9999,
                left: -9999,
                width: menuWidth,
                visibility: "hidden",
              }
        }
        className={cn(
          "z-50 rounded-md border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg",
          menuClassName,
        )}
      >
        {children}
      </div>
    ) : null;

  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        {trigger}
      </div>
      {menu && portalTarget ? createPortal(menu, portalTarget) : null}
    </>
  );
}

export function DropdownMenuItem({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]";

  if (href) {
    return (
      <a role="menuitem" href={href} className={className} onClick={onClick}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
