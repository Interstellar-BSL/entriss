"use client";

import { useSyncExternalStore } from "react";

import { isQrDebugMode } from "@/lib/kiosk/qr-decoder-engine";

const MAX_KIOSK_QR_DEBUG_EVENTS = 20;

export type KioskQrDebugEvent = {
  id: string;
  at: string;
  tag: string;
  message: string;
  detail?: Record<string, unknown>;
};

let events: KioskQrDebugEvent[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): KioskQrDebugEvent[] {
  return events;
}

function getServerSnapshot(): KioskQrDebugEvent[] {
  return [];
}

function formatConsoleDetail(detail?: Record<string, unknown>) {
  if (!detail || Object.keys(detail).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(detail)}`;
}

/** Append a kiosk QR debug event (panel + console). No-op when debug mode is off. */
export function appendKioskQrDebugEvent(
  tag: string,
  message: string,
  detail?: Record<string, unknown>,
) {
  if (!isQrDebugMode()) {
    return;
  }

  const entry: KioskQrDebugEvent = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    tag,
    message,
    ...(detail && Object.keys(detail).length > 0 ? { detail } : {}),
  };

  events = [entry, ...events].slice(0, MAX_KIOSK_QR_DEBUG_EVENTS);
  emit();

  console.log(`[${tag}] ${message}${formatConsoleDetail(detail)}`);
}

export function clearKioskQrDebugEvents() {
  if (events.length === 0) {
    return;
  }
  events = [];
  emit();
}

export function useKioskQrDebugEvents(): KioskQrDebugEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
