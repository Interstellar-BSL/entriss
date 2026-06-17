"use client";

import { useEffect, useState } from "react";

function formatKioskDateTime(date: Date) {
  return {
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    date: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function KioskDateTime() {
  const [now, setNow] = useState(() => formatKioskDateTime(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(formatKioskDateTime(new Date()));
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <p className="text-3xl font-light tracking-tight text-[var(--foreground)] tabular-nums">
        {now.time}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--muted)]">{now.date}</p>
    </div>
  );
}
