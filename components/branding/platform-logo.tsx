import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export function PlatformLogo({
  size = "sm",
  showName = true,
  className,
  href = "/",
  onClick,
}: {
  size?: "sm" | "md";
  showName?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const markSize = size === "md" ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs";
  const labelSize = size === "md" ? "text-sm" : "text-xs";

  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)] font-bold text-[var(--on-brand)]",
          markSize,
        )}
        aria-hidden
      >
        E
      </span>
      {showName ? (
        <span
          className={cn(
            "truncate font-semibold tracking-tight text-[var(--muted)]",
            labelSize,
          )}
        >
          Entriss
        </span>
      ) : null}
    </>
  );

  const classes = cn("flex min-w-0 items-center gap-2", className);

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {content}
    </Link>
  );
}
