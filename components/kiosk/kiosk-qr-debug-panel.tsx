"use client";

import { isQrDebugMode } from "@/lib/kiosk/qr-decoder-engine";
import {
  clearKioskQrDebugEvents,
  useKioskQrDebugEvents,
  type KioskQrDebugEvent,
} from "@/lib/kiosk/kiosk-qr-debug-log";
import { cn } from "@/lib/utils/cn";

function formatEventTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 19);
  }
}

function formatDetail(detail?: Record<string, unknown>) {
  if (!detail || Object.keys(detail).length === 0) {
    return null;
  }

  try {
    const text = JSON.stringify(detail);
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  } catch {
    return null;
  }
}

function DebugEventRow({ event }: { event: KioskQrDebugEvent }) {
  const detail = formatDetail(event.detail);

  return (
    <li className="border-b border-zinc-700/80 py-1 last:border-b-0">
      <div className="flex gap-1.5">
        <span className="shrink-0 text-zinc-500">{formatEventTime(event.at)}</span>
        <span className="shrink-0 font-semibold text-amber-400">[{event.tag}]</span>
        <span className="min-w-0 break-words text-zinc-200">{event.message}</span>
      </div>
      {detail ? (
        <p className="mt-0.5 break-all pl-[4.5rem] text-[9px] text-zinc-500">
          {detail}
        </p>
      ) : null}
    </li>
  );
}

export function KioskQrDebugPanel() {
  const events = useKioskQrDebugEvents();

  if (!isQrDebugMode()) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-3 right-3 z-[60]",
        "w-[min(22rem,calc(100vw-1.5rem))] rounded-md border border-zinc-600",
        "bg-zinc-950/92 shadow-lg backdrop-blur-sm",
      )}
      aria-label="Kiosk QR debug event log"
    >
      <div className="flex items-center justify-between border-b border-zinc-700 px-2 py-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          QR debug ({events.length}/20)
        </p>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          onClick={clearKioskQrDebugEvents}
        >
          Clear
        </button>
      </div>

      <ul className="max-h-44 overflow-y-auto px-2 py-1 font-mono text-[10px] leading-snug">
        {events.length === 0 ? (
          <li className="py-2 text-center text-zinc-500">Waiting for QR events…</li>
        ) : (
          events.map((event) => <DebugEventRow key={event.id} event={event} />)
        )}
      </ul>
    </div>
  );
}
