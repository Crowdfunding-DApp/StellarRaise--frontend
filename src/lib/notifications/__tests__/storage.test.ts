import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deletePreferences,
  getStorageKey,
  loadPreferences,
  savePreferences,
} from "../storage";
import type { NotificationPreferences } from "../types";

function makePrefs(
  walletAddress: string,
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    walletAddress,
    email: "user@example.com",
    consent: true,
    consentTimestamp: 1700000000000,
    channels: ["email"],
    updatedAt: 1700000000000,
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips preferences", () => {
    const prefs = makePrefs("WALLET-A");
    savePreferences(prefs);
    const loaded = loadPreferences("WALLET-A");
    expect(loaded).toEqual(prefs);
  });

  it("returns null when no record exists", () => {
    expect(loadPreferences("WALLET-UNKNOWN")).toBeNull();
  });

  it("returns null for null/undefined wallet", () => {
    expect(loadPreferences(null)).toBeNull();
    expect(loadPreferences(undefined)).toBeNull();
  });

  it("ignores records written for a different wallet", () => {
    savePreferences(makePrefs("WALLET-A"));
    expect(loadPreferences("WALLET-B")).toBeNull();
  });

  it("handles JSON parse failures gracefully", () => {
    window.localStorage.setItem(getStorageKey("WALLET-A"), "not-json");
    expect(loadPreferences("WALLET-A")).toBeNull();
  });

  it("handles records missing required fields", () => {
    window.localStorage.setItem(
      getStorageKey("WALLET-A"),
      JSON.stringify({ walletAddress: "WALLET-A" })
    );
    expect(loadPreferences("WALLET-A")).toBeNull();
  });

  it("filters channels to valid ids only", () => {
    const mixed = makePrefs("WALLET-A", {
      channels: ["email", "push", "sms" as unknown as "email"],
    });
    savePreferences(mixed);
    const loaded = loadPreferences("WALLET-A");
    expect(loaded?.channels).toEqual(["email", "push"]);
  });

  it("delete is idempotent", () => {
    savePreferences(makePrefs("WALLET-A"));
    deletePreferences("WALLET-A");
    deletePreferences("WALLET-A");
    expect(loadPreferences("WALLET-A")).toBeNull();
  });

  it("logs a warning when storage throws on write, never the raw email", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const setSpy = vi
      .spyOn(window.localStorage.__proto__, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    savePreferences(makePrefs("WALLET-A", { email: "secret@private.io" }));
    expect(warn).toHaveBeenCalled();
    const messages = warn.mock.calls.map((c) => String(c[0] ?? ""));
    for (const m of messages) {
      expect(m).not.toContain("secret@private.io");
    }
    setSpy.mockRestore();
  });
});
