/**
 * Public API surface for the notification subsystem (Issue #78).
 *
 * Importing from `@/lib/notifications` keeps refactors safe: external callers
 * only see the curated exports below.
 */

export type {
  NotificationChannel,
  NotificationChannelId,
  NotificationDeliveryRecord,
  NotificationDeliveryStatus,
  NotificationEvent,
  NotificationEventType,
  NotificationPreferences,
  RegisterResult,
  SimpleResult,
} from "./types";

export {
  CHANNEL_LABELS,
  availableChannelIds,
  defaultChannels,
  emailChannel,
  pushChannel,
} from "./channels";

export {
  NotificationService,
  __setNotificationServiceForTests,
  getNotificationService,
} from "./service";

export {
  loadPreferences,
  savePreferences,
  deletePreferences,
  getStorageKey,
} from "./storage";

export {
  redactEmail,
  redactWallet,
  requireConsent,
  validateEmail,
} from "./validation";

export {
  DEADLINE_APPROACHING_WINDOW_MS,
  useDeadlineApproachingTrigger,
  useRefundEligibleTrigger,
} from "./hooks";

export { isDeadlineApproaching, isRefundEligible } from "./predicates";
