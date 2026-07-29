/**
 * localStorage-backed preferences (Issue #78).
 *
 * - SSR safe: returns `null` / no-ops when `window` is undefined.
 * - Tolerant of quota errors / disabled storage: never throws to callers.
 * - Stored under a per-wallet key; clear on opt-out.
 * - Logs only redacted summaries; never the raw email.
 */

import type { NotificationPreferences } from "./types";

const STORAGE_KEY_PREFIX = "stellarraise:notifications:prefs:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStorageKey(walletAddress: string): string {
  return STORAGE_KEY_PREFIX + walletAddress;
}

export function loadPreferences(
  walletAddress: string | null | undefined
): NotificationPreferences | null {
  if (!walletAddress) return null;
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(getStorageKey(walletAddress));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.walletAddress !== walletAddress) return null;
    if (typeof parsed.email !== "string" || typeof parsed.consent !== "boolean") {
      return null;
    }
    if (!Array.isArray(parsed.channels)) return null;

    return {
      walletAddress: parsed.walletAddress,
      email: parsed.email,
      consent: parsed.consent,
      consentTimestamp:
        typeof parsed.consentTimestamp === "number"
          ? parsed.consentTimestamp
          : 0,
      channels: parsed.channels.filter(
        (c): c is "email" | "push" => c === "email" || c === "push"
      ),
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function savePreferences(prefs: NotificationPreferences): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(getStorageKey(prefs.walletAddress), JSON.stringify(prefs));
  } catch {
    // Quota, private mode, disabled cookies — surface to telemetry without
    // ever leaking the raw email.
    console.warn(
      "[notifications] Failed to persist preferences (storage unavailable)."
    );
  }
}

export function deletePreferences(walletAddress: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getStorageKey(walletAddress));
  } catch {
    console.warn("[notifications] Failed to clear preferences.");
  }
}
