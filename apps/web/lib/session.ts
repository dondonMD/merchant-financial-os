"use client";

import type { Session } from "./types";

const KEY = "zb-vaka-session";

export function getStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function setStoredSession(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(KEY);
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

