/**
 * NotificationService (Issue #78).
 *
 * The service is a thin orchestrator between:
 *   - preferences (storage)
 *   - channels (email / push / future)
 * It exposes a small, deterministic API designed to be safe to call from
 * React components, server-side fetch handlers, or background worklets.
 *
 * Singletons are kept simple: a process-wide instance is lazily created via
 * `getNotificationService()`. No per-request / per-user state lives on the
 * instance — all mutations are routed through localStorage at the call site —
 * so the singleton is safe to share across SSR requests. Tests can swap with
 * `__setNotificationServiceForTests`.
 */

import { defaultChannels, type NotificationChannel } from "./channels";
import {
  deletePreferences,
  loadPreferences,
  savePreferences,
} from "./storage";
import type {
  NotificationDeliveryRecord,
  NotificationEvent,
  NotificationPreferences,
  RegisterResult,
  SimpleResult,
} from "./types";
import { requireConsent, validateEmail } from "./validation";

function isChannelId(value: unknown): value is "email" | "push" {
  return value === "email" || value === "push";
}

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[] = defaultChannels) {
    this.channels = channels;
  }

  /** Replace the channel registry (used to add new channels without subclassing). */
  setChannels(channels: NotificationChannel[]): void {
    this.channels = channels;
  }

  getPreferences(
    walletAddress: string | null | undefined
  ): NotificationPreferences | null {
    return loadPreferences(walletAddress);
  }

  /**
   * Register a wallet → email + consent record. Duplicate-safe: if a record
   * exists for the same wallet, it is merged instead of erroring.
   */
  register(
    walletAddress: string | null | undefined,
    email: string,
    consent: boolean
  ): RegisterResult {
    if (!walletAddress) {
      return { ok: false, error: "Connect your wallet before opting in." };
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid || !emailCheck.normalized) {
      return { ok: false, error: emailCheck.error || "Invalid email." };
    }
    const consentCheck = requireConsent(consent);
    if (!consentCheck.valid) {
      return { ok: false, error: consentCheck.error || "Consent required." };
    }

    const existing = loadPreferences(walletAddress);
    const merged: NotificationPreferences = {
      walletAddress,
      email: emailCheck.normalized,
      // Always require explicit affirmative consent at registration time.
      consent: true,
      consentTimestamp: existing?.consentTimestamp ?? Date.now(),
      channels:
        existing && existing.channels.length > 0
          ? existing.channels
          : ["email"],
      updatedAt: Date.now(),
    };
    savePreferences(merged);
    return { ok: true, prefs: merged };
  }

  /**
   * Update specific preference fields without losing the wallet binding.
   *
   * Note: passing `consent: false` is rejected — callers should use
   * `optOut()` to disable notifications. This avoids surprising callers
   * who may not realise a partial update can wipe data.
   */
  update(
    walletAddress: string | null | undefined,
    patch: Partial<
      Pick<NotificationPreferences, "email" | "consent" | "channels">
    >
  ): RegisterResult {
    if (!walletAddress) {
      return { ok: false, error: "Connect your wallet before updating." };
    }
    const existing = loadPreferences(walletAddress);
    if (!existing) {
      return {
        ok: false,
        error: "No notification preferences to update. Please opt in first.",
      };
    }

    const next: NotificationPreferences = { ...existing };

    if (patch.email !== undefined) {
      const check = validateEmail(patch.email);
      if (!check.valid || !check.normalized) {
        return { ok: false, error: check.error || "Invalid email." };
      }
      next.email = check.normalized;
    }

    if (patch.consent !== undefined) {
      if (!patch.consent) {
        // Reject — use optOut() to disable. Preserves data and audit trail.
        return {
          ok: false,
          error:
            "To disable notifications, call optOut() instead of passing consent: false to update().",
        };
      }
      const check = requireConsent(true);
      if (!check.valid) {
        return { ok: false, error: check.error || "Consent required." };
      }
      next.consent = true;
      next.consentTimestamp = Date.now();
    }

    if (patch.channels !== undefined) {
      const filtered = patch.channels.filter(isChannelId);
      if (filtered.length === 0) {
        return {
          ok: false,
          error: "Select at least one notification channel.",
        };
      }
      next.channels = filtered;
    }

    next.updatedAt = Date.now();
    savePreferences(next);
    return { ok: true, prefs: next };
  }

  /** Erase per-wallet preference record. Idempotent. */
  optOut(walletAddress: string | null | undefined): SimpleResult {
    if (!walletAddress) {
      return { ok: false, error: "Connect your wallet before opting out." };
    }
    deletePreferences(walletAddress);
    return { ok: true };
  }

  /**
   * Dispatch an event to every enabled channel. Failures are recorded per
   * channel but never thrown — the caller should treat the returned records
   * as the source of truth for delivery state.
   */
  async dispatch(
    event: NotificationEvent
  ): Promise<NotificationDeliveryRecord[]> {
    const prefs = loadPreferences(event.walletAddress);
    if (!prefs || !prefs.consent) {
      return [];
    }
    const records: NotificationDeliveryRecord[] = [];
    for (const channel of this.channels) {
      if (!prefs.channels.includes(channel.id)) continue;
      try {
        // Each channel handles its own isolation; we serialize so the order
        // in delivery records matches the order channels were registered.
        const record = await channel.send(event, prefs);
        records.push(record);
      } catch (err) {
        records.push({
          eventType: event.type,
          channel: channel.id,
          status: "failed",
          timestamp: Date.now(),
          errorCode: "CHANNEL_EXCEPTION",
          errorMessage:
            err instanceof Error ? err.message : "Channel threw unexpectedly.",
        });
      }
    }
    return records;
  }
}

let _instance: NotificationService | null = null;

/** Process-wide notification service. SSR-safe: no per-request state is held
 *  on the instance, so reusing it across renders does not leak user data. */
export function getNotificationService(): NotificationService {
  if (!_instance) {
    _instance = new NotificationService();
  }
  return _instance;
}

/** Test-only injection point. Pass `null` to fall back to the lazy singleton. */
export function __setNotificationServiceForTests(
  instance: NotificationService | null
): void {
  _instance = instance;
}
