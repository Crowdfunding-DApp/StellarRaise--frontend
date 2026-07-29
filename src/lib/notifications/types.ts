/**
 * Type contracts for the notification subsystem (Issue #78).
 *
 * Design goals:
 *  - Strongly-typed events so business logic and channels stay decoupled.
 *  - Preferences are stored against a wallet address, not a user record.
 *  - PII (raw email) is never embedded in event payloads or delivery logs.
 *  - Delivery records are safe to surface in telemetry / error UI.
 */

export type NotificationEventType =
  | "campaign.deadline_approaching"
  | "campaign.refund_eligible";

export type NotificationChannelId = "email" | "push";

export interface NotificationEvent {
  type: NotificationEventType;
  /** Connected Stellar wallet. Used to look up preferences; not exposed to UI. */
  walletAddress: string;
  campaignId: string;
  campaignTitle: string;
  /** Campaign deadline in ISO-8601 (used to anchor time-sensitive messages). */
  campaignDeadline?: string;
}

export interface NotificationPreferences {
  walletAddress: string;
  email: string;
  consent: boolean;
  /** When the user first gave explicit consent (epoch ms). */
  consentTimestamp: number;
  /** Channels the user has opted into. */
  channels: NotificationChannelId[];
  /** Last preference update (epoch ms). */
  updatedAt: number;
}

export type NotificationDeliveryStatus =
  | "sent"
  | "skipped"
  | "failed"
  | "pending";

export interface NotificationDeliveryRecord {
  eventType: NotificationEventType;
  channel: NotificationChannelId;
  status: NotificationDeliveryStatus;
  timestamp: number;
  /** Stable error code. Never contains the raw recipient address. */
  errorCode?: string;
  /** Human-friendly, PII-redacted message. */
  errorMessage?: string;
}

export interface NotificationChannel {
  readonly id: NotificationChannelId;
  send(
    event: NotificationEvent,
    prefs: NotificationPreferences
  ): Promise<NotificationDeliveryRecord>;
}

export type RegisterResult =
  | { ok: true; prefs: NotificationPreferences }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };
