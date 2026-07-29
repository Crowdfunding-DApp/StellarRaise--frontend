/**
 * Notification channel implementations (Issue #78).
 *
 * Channels are pluggable: each implements `NotificationChannel`. Business logic
 * never knows which channel is in use; the service iterates and dispatches.
 *
 * - `emailChannel`: when `NEXT_PUBLIC_NOTIFICATIONS_API_URL` is set, it POSTs
 *   to a backend endpoint (Issue #3 dependency). When unset, it falls back to
 *   a local "simulated delivery" path so the UI flow remains testable. The
 *   fallback never actually sends anything — it only logs a redacted summary.
 * - `pushChannel`: uses the browser `Notification` API. Skipped when the API
 *   is unavailable or permission is not granted. This is the extension point
 *   for richer push providers (FCM / Web Push) in a follow-up issue.
 *
 * `availableChannelIds` and `CHANNEL_LABELS` are also exported so the UI can
 * render channel toggles data-driven. Adding a new channel requires:
 *   1. Implement `NotificationChannel` and register it in `defaultChannels`.
 *   2. Add its id to `availableChannelIds` and a label to `CHANNEL_LABELS`.
 * No changes to `NotificationSettingsModal` are required.
 */

import type {
  NotificationChannel,
  NotificationChannelId,
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
  NotificationEvent,
  NotificationPreferences,
} from "./types";
import { redactEmail, redactWallet } from "./validation";

// Re-export for callers that import types from a single module.
export type { NotificationChannel } from "./types";

/** Channel ids the UI is currently allowed to expose. */
export const availableChannelIds: NotificationChannelId[] = ["email", "push"];

/** Human-friendly labels for the channel toggles in the modal. */
export const CHANNEL_LABELS: Record<NotificationChannelId, string> = {
  email: "Email",
  push: "Browser push",
};

function getApiUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL;
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

function okRecord(
  event: NotificationEvent,
  channel: NotificationChannelId,
  status: NotificationDeliveryStatus,
  errorCode?: string,
  errorMessage?: string
): NotificationDeliveryRecord {
  return {
    eventType: event.type,
    channel,
    status,
    timestamp: Date.now(),
    errorCode,
    errorMessage,
  };
}

export const emailChannel: NotificationChannel = {
  id: "email",

  async send(
    event: NotificationEvent,
    prefs: NotificationPreferences
  ): Promise<NotificationDeliveryRecord> {
    if (!prefs.email || !prefs.consent) {
      return okRecord(
        event,
        "email",
        "skipped",
        "MISSING_CONSENT",
        "Email skipped: no consent or address."
      );
    }

    const apiUrl = getApiUrl();
    if (!apiUrl) {
      // No provider configured: simulate delivery so the UI flow remains
      // exercisable end-to-end. Logs omit the raw email entirely.
      if (typeof console !== "undefined" && console.info) {
        console.info(
          "[notifications:email] simulated delivery",
          JSON.stringify({
            event: event.type,
            recipient: redactEmail(prefs.email),
            campaign: event.campaignId,
          })
        );
      }
      return okRecord(event, "email", "sent");
    }

    try {
      const response = await fetch(`${apiUrl}/notifications/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prefs.email,
          event: event.type,
          campaignId: event.campaignId,
          campaignTitle: event.campaignTitle,
          walletAddress: redactWallet(event.walletAddress),
        }),
        // The backend is responsible for any anti-abuse; no client secret here.
      });

      if (!response.ok) {
        return okRecord(
          event,
          "email",
          "failed",
          `HTTP_${response.status}`,
          "Email delivery failed."
        );
      }
      return okRecord(event, "email", "sent");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Email delivery network error";
      return okRecord(event, "email", "failed", "NETWORK_ERROR", message);
    }
  },
};

export const pushChannel: NotificationChannel = {
  id: "push",

  async send(
    event: NotificationEvent,
    _prefs: NotificationPreferences
  ): Promise<NotificationDeliveryRecord> {
    // `_prefs` is intentionally unused: push uses browser permission, not
    // server preferences. The `void` keeps the linter from flagging the
    // unused parameter without changing runtime behaviour.
    void _prefs;

    if (
      typeof Notification === "undefined" ||
      typeof window === "undefined"
    ) {
      return okRecord(
        event,
        "push",
        "skipped",
        "UNSUPPORTED",
        "Browser push notifications are not available in this environment."
      );
    }
    if (Notification.permission !== "granted") {
      return okRecord(
        event,
        "push",
        "skipped",
        "NO_PERMISSION",
        "Push permission not granted."
      );
    }
    try {
      // Body intentionally excludes wallet / email; only campaign metadata.
      new Notification(
        `Stellar Raise — ${event.type.replace("campaign.", "")}`,
        {
          body: `Update for ${event.campaignTitle}`,
          tag: `stellarraise:${event.campaignId}`,
        }
      );
      return okRecord(event, "push", "sent");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Browser push failed.";
      return okRecord(event, "push", "failed", "BROWSER_ERROR", message);
    }
  },
};

export const defaultChannels: NotificationChannel[] = [emailChannel, pushChannel];
